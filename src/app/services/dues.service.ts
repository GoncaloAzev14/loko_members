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
  query,
  where,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, switchMap, filter } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Due } from '../models/models';
import { ClubService } from './club.service';

@Injectable({ providedIn: 'root' })
export class DuesService {
  private firestore = inject(Firestore);
  private clubService = inject(ClubService);

  private duesCol(clubId: string) {
    return collection(this.firestore, 'clubs', clubId, 'dues');
  }

  private dues$ = toObservable(this.clubService.clubId).pipe(
    filter((id): id is string => !!id),
    switchMap((id) =>
      collectionData(this.duesCol(id), { idField: 'id' }) as Observable<Due[]>
    )
  );

  getAll(): Observable<Due[]> {
    return this.dues$;
  }

  getForMember(memberId: string): Observable<Due[]> {
    return toObservable(this.clubService.clubId).pipe(
      filter((id): id is string => !!id),
      switchMap((id) =>
        collectionData(
          query(this.duesCol(id), where('memberId', '==', memberId)),
          { idField: 'id' }
        ) as Observable<Due[]>
      )
    );
  }

  async add(data: {
    memberId: string;
    description: string;
    amount: number;
    year: number;
    dueDate: Timestamp;
  }): Promise<void> {
    const clubId = this.clubService.clubId()!;
    const id = uuidv4();
    const due: Due = { id, paid: false, createdAt: Timestamp.now(), ...data };
    await setDoc(doc(this.duesCol(clubId), id), due);
  }

  async addImported(data: {
    memberId: string;
    description: string;
    amount: number;
    year: number;
    dueDate: Timestamp;
    paid: boolean;
    paidAt?: Timestamp;
  }): Promise<void> {
    const clubId = this.clubService.clubId()!;
    const id = uuidv4();
    const due: Due = { id, createdAt: Timestamp.now(), ...data };
    await setDoc(doc(this.duesCol(clubId), id), due);
  }

  /** Creates one due per member ID, sequentially. Callers decide which members to skip. */
  async bulkGenerate(
    memberIds: string[],
    data: { description: string; amount: number; year: number; dueDate: Timestamp }
  ): Promise<number> {
    const clubId = this.clubService.clubId()!;
    for (const memberId of memberIds) {
      const id = uuidv4();
      const due: Due = { id, memberId, paid: false, createdAt: Timestamp.now(), ...data };
      await setDoc(doc(this.duesCol(clubId), id), due);
    }
    return memberIds.length;
  }

  async markPaid(id: string, at?: Timestamp): Promise<void> {
    const clubId = this.clubService.clubId()!;
    await updateDoc(doc(this.duesCol(clubId), id), { paid: true, paidAt: at ?? Timestamp.now() });
  }

  async markUnpaid(id: string): Promise<void> {
    const clubId = this.clubService.clubId()!;
    await updateDoc(doc(this.duesCol(clubId), id), { paid: false, paidAt: null });
  }

  async remove(id: string): Promise<void> {
    const clubId = this.clubService.clubId()!;
    await deleteDoc(doc(this.duesCol(clubId), id));
  }
}
