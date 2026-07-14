import { Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  reload,
  sendPasswordResetEmail,
} from '@angular/fire/auth';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  loading = signal(true);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser.set(user);
      this.loading.set(false);
    });
  }

  /** Resolves once the initial auth state has been determined. */
  waitUntilReady(): Promise<void> {
    if (!this.loading()) return Promise.resolve();
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(this.auth, () => {
        unsub();
        resolve();
      });
    });
  }

  async signUp(email: string, password: string, displayName: string): Promise<void> {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(cred.user, { displayName });
    // onAuthStateChanged fires before updateProfile, so the signal has a stale
    // user without displayName — update it manually after the profile write.
    await reload(cred.user);
    this.currentUser.set(cred.user);
  }

  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
    await this.router.navigate(['/login']);
  }

  get uid(): string | null {
    return this.currentUser()?.uid ?? null;
  }
}
