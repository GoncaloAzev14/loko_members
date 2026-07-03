import { Timestamp } from '@angular/fire/firestore';

export interface Club {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: Timestamp;
  createdBy: string;
}

export interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  active: boolean;
  joinedAt: Timestamp;
  notes?: string;
  memberNumber?: number; // optional — legacy members won't have one until backfilled manually
}

export interface Due {
  id: string;
  memberId: string;
  description: string;
  amount: number;
  dueDate: Timestamp;
  year?: number; // optional — legacy dues won't have one; read via getDueYear()
  paid: boolean;
  paidAt?: Timestamp;
  createdAt: Timestamp;
}

// Legacy dues predate the `year` field — always read a due's year through this helper.
export function getDueYear(due: Due): number {
  return due.year ?? due.dueDate.toDate().getFullYear();
}

export interface Manager {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'owner' | 'manager'; // 'owner' kept for backward compat with existing docs
  joinedAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  clubId: string;       // active club
  clubIds?: string[];   // all clubs — optional for backward compat with existing docs
}
