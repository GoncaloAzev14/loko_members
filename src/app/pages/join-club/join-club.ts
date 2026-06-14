import { Component, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClubService } from '../../services/club.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-join-club',
  imports: [FormsModule],
  templateUrl: './join-club.html',
  styleUrl: './join-club.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class JoinClubComponent {
  private clubService = inject(ClubService);
  private auth = inject(AuthService);
  private router = inject(Router);

  mode = signal<'choose' | 'create' | 'join'>('choose');
  clubName = '';
  inviteCode = '';
  error = signal('');
  loading = signal(false);

  async createClub() {
    if (!this.clubName.trim()) return;
    this.error.set('');
    this.loading.set(true);
    try {
      await this.clubService.createClub(this.clubName.trim());
      await this.router.navigate(['/']);
    } catch (err) {
      console.error('[JoinClub] createClub failed:', err);
      this.error.set('Could not create club. Try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async joinClub() {
    if (!this.inviteCode.trim()) return;
    this.error.set('');
    this.loading.set(true);
    try {
      const ok = await this.clubService.joinClub(this.inviteCode.trim());
      if (ok) {
        await this.router.navigate(['/']);
      } else {
        this.error.set('Invite code not found. Double-check and try again.');
      }
    } catch (err) {
      console.error('[JoinClub] joinClub failed:', err);
      this.error.set('Could not join. Try again.');
    } finally {
      this.loading.set(false);
    }
  }

  signOut() {
    this.auth.signOut();
  }
}
