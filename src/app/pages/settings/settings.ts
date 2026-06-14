import { Component, inject, signal, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClubService } from '../../services/club.service';
import { AuthService } from '../../services/auth.service';
import { Manager } from '../../models/models';

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

  managers = signal<Manager[]>([]);
  editingName = signal(false);
  newClubName = '';
  savingName = signal(false);

  confirmRemoveUid = signal<string | null>(null);
  codeVisible = signal(false);
  regenerating = signal(false);

  async ngOnInit() {
    this.managers.set(await this.clubService.getManagers());
  }

  get isOwner(): boolean {
    const uid = this.auth.uid;
    return this.managers().find((m) => m.uid === uid)?.role === 'owner';
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

  copyCode() {
    const code = this.clubService.club()?.inviteCode;
    if (code) navigator.clipboard.writeText(code);
  }
}
