import { Component, inject, signal, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClubService } from '../../services/club.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-clubs',
  imports: [FormsModule],
  templateUrl: './clubs.html',
  styleUrl: './clubs.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ClubsComponent implements OnInit {
  clubService = inject(ClubService);
  private router = inject(Router);
  i18n = inject(I18nService);

  async ngOnInit() {
    if (this.clubService.clubs().length === 0) {
      await this.clubService.loadUserClub();
    }
  }

  mode = signal<'list' | 'create' | 'join'>('list');
  clubName = '';
  inviteCode = '';
  error = signal('');
  loading = signal(false);

  async enterClub(clubId: string) {
    if (clubId !== this.clubService.clubId()) {
      await this.clubService.switchClub(clubId);
    }
    this.router.navigate(['/dashboard']);
  }

  async createClub() {
    if (!this.clubName.trim()) return;
    this.error.set('');
    this.loading.set(true);
    try {
      await this.clubService.createClub(this.clubName.trim());
      this.clubName = '';
      this.mode.set('list');
      await this.router.navigate(['/dashboard']);
    } catch (err) {
      console.error('[Clubs] createClub failed:', err);
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
        this.inviteCode = '';
        this.mode.set('list');
        await this.router.navigate(['/dashboard']);
      } else {
        this.error.set(this.i18n.t('join.errorCodeNotFound'));
      }
    } catch (err) {
      console.error('[Clubs] joinClub failed:', err);
      this.error.set(this.i18n.t('join.errorJoin'));
    } finally {
      this.loading.set(false);
    }
  }
}
