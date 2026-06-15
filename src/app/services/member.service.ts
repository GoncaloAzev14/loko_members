import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, switchMap, filter } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Member } from '../models/models';
import { ClubService } from './club.service';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private firestore = inject(Firestore);
  private clubService = inject(ClubService);

  private membersCol(clubId: string) {
    return collection(this.firestore, 'clubs', clubId, 'members');
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

  async add(data: Omit<Member, 'id' | 'joinedAt' | 'active'> & { active?: boolean }): Promise<string> {
    const clubId = this.clubService.clubId()!;
    const id = uuidv4();
    const { active = true, ...rest } = data;
    const member: Member = { id, active, joinedAt: Timestamp.now(), ...rest };
    await setDoc(doc(this.membersCol(clubId), id), stripUndefined(member));
    return id;
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
