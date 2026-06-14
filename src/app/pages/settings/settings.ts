import { Component, inject, signal, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClubService } from '../../services/club.service';
import { AuthService } from '../../services/auth.service';
import { Manager } from '../../models/models';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SettingsComponent implements OnInit {
  clubService = inject(ClubService);
  auth = inject(AuthService);
  i18n = inject(I18nService);

  managers = signal<Manager[]>([]);
  editingName = signal(false);
  newClubName = '';
  savingName = signal(false);

  confirmRemoveUid = signal<string | null>(null);
  confirmPromoteUid = signal<string | null>(null);
  codeVisible = signal(false);
  regenerating = signal(false);

  async ngOnInit() {
    this.managers.set(await this.clubService.getManagers());
  }

  get isAdmin(): boolean {
    return this.clubService.isAdmin;
  }

  startEditName() {
    this.newClubName = this.clubService.club()?.name ?? '';
    this.editingName.set(true);
  }

  async saveName() {
    if (!this.newClubName.trim()) return;
    this.savingName.set(true);
    try {
      await this.clubService.updateClubName(this.newClubName.trim());
      this.editingName.set(false);
    } finally {
      this.savingName.set(false);
    }
  }

  async regenerateCode() {
    this.regenerating.set(true);
    try {
      await this.clubService.regenerateInviteCode();
    } finally {
      this.regenerating.set(false);
    }
  }

  async removeManager(uid: string) {
    await this.clubService.removeManager(uid);
    this.managers.set(await this.clubService.getManagers());
    this.confirmRemoveUid.set(null);
  }

  async promoteToAdmin(uid: string) {
    await this.clubService.promoteToAdmin(uid);
    this.managers.set(await this.clubService.getManagers());
    this.confirmPromoteUid.set(null);
  }

  copyCode() {
    const code = this.clubService.club()?.inviteCode;
    if (code) navigator.clipboard.writeText(code);
  }
}
