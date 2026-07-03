import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  Firestore,
  Transaction,
  collection,
  collectionData,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, switchMap, filter } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Member } from '../models/models';
import { ClubService } from './club.service';

export class MemberNumberTakenError extends Error {
  constructor(public readonly number: number) {
    super(`Member number ${number} is already in use.`);
    this.name = 'MemberNumberTakenError';
  }
}

@Injectable({ providedIn: 'root' })
export class MemberService {
  private firestore = inject(Firestore);
  private clubService = inject(ClubService);

  private membersCol(clubId: string) {
    return collection(this.firestore, 'clubs', clubId, 'members');
  }

  private counterDoc(clubId: string) {
    return doc(this.firestore, 'clubs', clubId, 'counters', 'memberNumber');
  }

  private lockDoc(clubId: string, number: number) {
    return doc(this.firestore, 'clubs', clubId, 'memberNumberLocks', String(number));
  }

  private members$ = toObservable(this.clubService.clubId).pipe(
    filter((id): id is string => !!id),
    switchMap((id) =>
      collectionData(this.membersCol(id), { idField: 'id' }) as Observable<Member[]>
    )
  );

  getAll(): Observable<Member[]> {
    return this.members$;
  }

  /** Advisory only (not reserved) — for showing a "next number" hint in the add-member form. */
  async peekNextMemberNumber(): Promise<number> {
    const clubId = this.clubService.clubId()!;
    const snap = await getDoc(this.counterDoc(clubId));
    const current = (snap.data()?.['value'] as number | undefined) ?? 0;
    return current + 1;
  }

  async add(
    data: Omit<Member, 'id' | 'joinedAt' | 'active' | 'memberNumber'> & {
      active?: boolean;
      memberNumber?: number;
    }
  ): Promise<string> {
    const clubId = this.clubService.clubId()!;
    const id = uuidv4();
    const { active = true, memberNumber, ...rest } = data;
    const memberRef = doc(this.membersCol(clubId), id);

    await runTransaction(this.firestore, async (tx) => {
      const assignedNumber = await this.reserveMemberNumber(tx, clubId, id, memberNumber);
      const member: Member = {
        id,
        active,
        joinedAt: Timestamp.now(),
        memberNumber: assignedNumber,
        ...rest,
      };
      tx.set(memberRef, stripUndefined(member));
    });

    return id;
  }

  /** Reassigns a member's number, releasing their previous one (if any) so it becomes available again. */
  async updateMemberNumber(id: string, newNumber: number, previousNumber?: number): Promise<void> {
    const clubId = this.clubService.clubId()!;
    const memberRef = doc(this.membersCol(clubId), id);

    await runTransaction(this.firestore, async (tx) => {
      const assignedNumber = await this.reserveMemberNumber(tx, clubId, id, newNumber);
      if (previousNumber != null && previousNumber !== newNumber) {
        tx.delete(this.lockDoc(clubId, previousNumber));
      }
      tx.update(memberRef, { memberNumber: assignedNumber });
    });
  }

  // Firestore transactions require all reads before any writes, so callers must await this
  // (it performs its own reads+writes) before issuing any further writes of their own.
  private async reserveMemberNumber(
    tx: Transaction,
    clubId: string,
    memberId: string,
    requestedNumber?: number
  ): Promise<number> {
    const counterRef = this.counterDoc(clubId);
    const counterSnap = await tx.get(counterRef);
    const current = (counterSnap.data()?.['value'] as number | undefined) ?? 0;

    if (requestedNumber != null) {
      const lockRef = this.lockDoc(clubId, requestedNumber);
      const lockSnap = await tx.get(lockRef);
      if (lockSnap.exists() && lockSnap.data()['memberId'] !== memberId) {
        throw new MemberNumberTakenError(requestedNumber);
      }
      tx.set(lockRef, { memberId });
      if (requestedNumber > current) {
        tx.set(counterRef, { value: requestedNumber });
      }
      return requestedNumber;
    }

    const next = current + 1;
    tx.set(counterRef, { value: next });
    tx.set(this.lockDoc(clubId, next), { memberId });
    return next;
  }

  async update(id: string, data: Partial<Member>): Promise<void> {
    const clubId = this.clubService.clubId()!;
    await updateDoc(doc(this.membersCol(clubId), id), stripUndefined(data) as Record<string, unknown>);
  }

  async remove(id: string): Promise<void> {
    const clubId = this.clubService.clubId()!;
    await deleteDoc(doc(this.membersCol(clubId), id));
  }
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}
