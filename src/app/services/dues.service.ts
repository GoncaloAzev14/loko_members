import { Injectable, inject } from '@angular/core';
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
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Due } from '../models/models';
import { ClubService } from './club.service';

@Injectable({ providedIn: 'root' })
export class DuesService {
  private firestore = inject(Firestore);
  private clubService = inject(ClubService);

  private duesCol() {
    const clubId = this.clubService.clubId()!;
    return collection(this.firestore, 'clubs', clubId, 'dues');
  }

  getAll(): Observable<Due[]> {
    return collectionData(this.duesCol(), { idField: 'id' }) as Observable<Due[]>;
  }

  getForMember(memberId: string): Observable<Due[]> {
    const q = query(this.duesCol(), where('memberId', '==', memberId));
    return collectionData(q, { idField: 'id' }) as Observable<Due[]>;
  }

  async add(data: { memberId: string; description: string; amount: number; dueDate: Timestamp }): Promise<void> {
    const id = uuidv4();
    const due: Due = {
      id,
      paid: false,
      createdAt: Timestamp.now(),
      ...data,
    };
    await setDoc(doc(this.duesCol(), id), due);
  }

  async markPaid(id: string): Promise<void> {
    await updateDoc(doc(this.duesCol(), id), {
      paid: true,
      paidAt: Timestamp.now(),
    });
  }

  async markUnpaid(id: string): Promise<void> {
    await updateDoc(doc(this.duesCol(), id), {
      paid: false,
      paidAt: null,
    });
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(this.duesCol(), id));
  }
}
