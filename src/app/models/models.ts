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
}

export interface Due {
  id: string;
  memberId: string;
  description: string;
  amount: number;
  dueDate: Timestamp;
  paid: boolean;
  paidAt?: Timestamp;
  createdAt: Timestamp;
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
