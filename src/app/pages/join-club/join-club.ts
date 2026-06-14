import { Component, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClubService } from '../../services/club.service';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../services/i18n.service';

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
  i18n = inject(I18nService);

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
      this.error.set(this.i18n.t('join.errorCreate'));
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
        this.error.set(this.i18n.t('join.errorCodeNotFound'));
      }
    } catch (err) {
      console.error('[JoinClub] joinClub failed:', err);
      this.error.set(this.i18n.t('join.errorJoin'));
    } finally {
      this.loading.set(false);
    }
  }

  signOut() {
    this.auth.signOut();
  }
}
