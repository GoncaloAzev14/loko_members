import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from '@angular/fire/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Club, Manager, UserProfile } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ClubService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  clubId = signal<string | null>(null);
  club = signal<Club | null>(null);
  currentManagerRole = signal<Manager['role'] | null>(null);

  get isAdmin(): boolean {
    const r = this.currentManagerRole();
    return r === 'admin' || r === 'owner';
  }

  async loadUserClub(): Promise<void> {
    const uid = this.auth.uid;
    if (!uid) return;

    const userDoc = await getDoc(doc(this.firestore, 'users', uid));
    if (userDoc.exists()) {
      const profile = userDoc.data() as UserProfile;
      this.clubId.set(profile.clubId);
      await this.loadClub(profile.clubId);
    }
  }

  private async loadClub(clubId: string): Promise<void> {
    const uid = this.auth.uid;
    const [clubDoc, managerDoc] = await Promise.all([
      getDoc(doc(this.firestore, 'clubs', clubId)),
      uid ? getDoc(doc(this.firestore, 'clubs', clubId, 'managers', uid)) : Promise.resolve(null),
    ]);
    if (clubDoc.exists()) {
      this.club.set({ id: clubId, ...clubDoc.data() } as Club);
    }
    if (managerDoc?.exists()) {
      this.currentManagerRole.set((managerDoc.data() as Manager).role);
    }
  }

  async createClub(name: string): Promise<void> {
    const uid = this.auth.uid;
    const user = this.auth.currentUser();
    if (!uid || !user) {
      console.error('[ClubService] createClub called without authenticated user');
      throw new Error('Not authenticated');
    }
    const clubId = uuidv4();
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const club: Omit<Club, 'id'> = {
      name,
      inviteCode,
      createdAt: Timestamp.now(),
      createdBy: uid,
    };

    await setDoc(doc(this.firestore, 'clubs', clubId), club);

    const manager: Manager = {
      uid,
      name: user.displayName ?? user.email ?? 'Admin',
      email: user.email ?? '',
      role: 'admin',
      joinedAt: Timestamp.now(),
    };
    await setDoc(doc(this.firestore, 'clubs', clubId, 'managers', uid), manager);

    const profile: UserProfile = { uid, clubId };
    await setDoc(doc(this.firestore, 'users', uid), profile);

    this.clubId.set(clubId);
    this.club.set({ id: clubId, ...club });
  }

  async joinClub(inviteCode: string): Promise<boolean> {
    const uid = this.auth.uid!;
    const user = this.auth.currentUser()!;

    const q = query(collection(this.firestore, 'clubs'), where('inviteCode', '==', inviteCode.toUpperCase()));
    const snap = await getDocs(q);

    if (snap.empty) return false;

    const clubDoc = snap.docs[0];
    const clubId = clubDoc.id;

    const manager: Manager = {
      uid,
      name: user.displayName ?? user.email ?? 'Manager',
      email: user.email ?? '',
      role: 'manager',
      joinedAt: Timestamp.now(),
    };
    await setDoc(doc(this.firestore, 'clubs', clubId, 'managers', uid), manager);

    const profile: UserProfile = { uid, clubId };
    await setDoc(doc(this.firestore, 'users', uid), profile);

    this.clubId.set(clubId);
    this.club.set({ id: clubId, ...clubDoc.data() } as Club);
    return true;
  }

  async updateClubName(name: string): Promise<void> {
    const clubId = this.clubId();
    if (!clubId) return;
    await updateDoc(doc(this.firestore, 'clubs', clubId), { name });
    this.club.update((c) => (c ? { ...c, name } : null));
  }

  async getManagers(): Promise<Manager[]> {
    const clubId = this.clubId();
    if (!clubId) return [];
    const snap = await getDocs(collection(this.firestore, 'clubs', clubId, 'managers'));
    return snap.docs.map((d) => d.data() as Manager);
  }

  async removeManager(uid: string): Promise<void> {
    const clubId = this.clubId();
    if (!clubId) return;
    const { deleteDoc } = await import('@angular/fire/firestore');
    await deleteDoc(doc(this.firestore, 'clubs', clubId, 'managers', uid));
  }

  async promoteToAdmin(uid: string): Promise<void> {
    const clubId = this.clubId();
    if (!clubId) return;
    await updateDoc(doc(this.firestore, 'clubs', clubId, 'managers', uid), { role: 'admin' });
  }

  async regenerateInviteCode(): Promise<string> {
    const clubId = this.clubId();
    if (!clubId) throw new Error('No club');
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await updateDoc(doc(this.firestore, 'clubs', clubId), { inviteCode: newCode });
    this.club.update((c) => (c ? { ...c, inviteCode: newCode } : null));
    return newCode;
  }
}
