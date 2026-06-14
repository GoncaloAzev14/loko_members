import { Injectable, inject } from '@angular/core';
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
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Member } from '../models/models';
import { ClubService } from './club.service';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private firestore = inject(Firestore);
  private clubService = inject(ClubService);

  private membersCol() {
    const clubId = this.clubService.clubId()!;
    return collection(this.firestore, 'clubs', clubId, 'members');
  }

  getAll(): Observable<Member[]> {
    return collectionData(this.membersCol(), { idField: 'id' }) as Observable<Member[]>;
  }

  async add(data: Omit<Member, 'id' | 'joinedAt' | 'active'>): Promise<void> {
    const id = uuidv4();
    const member: Member = {
      id,
      active: true,
      joinedAt: Timestamp.now(),
      ...data,
    };
    await setDoc(doc(this.membersCol(), id), member);
  }

  async update(id: string, data: Partial<Member>): Promise<void> {
    await updateDoc(doc(this.membersCol(), id), data as Record<string, unknown>);
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(this.membersCol(), id));
  }
}
