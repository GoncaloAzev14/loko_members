import { Component, inject, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ClubService } from '../../services/club.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ShellComponent implements OnInit {
  clubService = inject(ClubService);
  auth = inject(AuthService);

  async ngOnInit() {
    await this.clubService.loadUserClub();
  }
}
