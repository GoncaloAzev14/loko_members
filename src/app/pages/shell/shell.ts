import { Component, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { ClubService } from '../../services/club.service';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ShellComponent {
  clubService = inject(ClubService);
  auth = inject(AuthService);
  i18n = inject(I18nService);
  private router = inject(Router);

  dropdownOpen = signal(false);

  activeTabIndex = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.computeTabIndex()),
    ),
    { initialValue: this.computeTabIndex() }
  );

  private computeTabIndex(): number {
    const url = this.router.url;
    if (url.startsWith('/members')) return 1;
    if (url.startsWith('/settings')) return 2;
    return 0;
  }

  async selectClub(clubId: string) {
    this.dropdownOpen.set(false);
    if (clubId !== this.clubService.clubId()) {
      await this.clubService.switchClub(clubId);
    }
    this.router.navigate(['/dashboard']);
  }

  goHome() {
    this.dropdownOpen.set(false);
    this.router.navigate(['/clubs']);
  }
}
