import { Component, inject, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { MemberService } from '../../services/member.service';
import { DuesService } from '../../services/dues.service';
import { Member, Due } from '../../models/models';

@Component({
  selector: 'app-member-list',
  imports: [FormsModule, RouterLink, TitleCasePipe],
  templateUrl: './member-list.html',
  styleUrl: './member-list.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MemberListComponent {
  private memberService = inject(MemberService);
  private duesService = inject(DuesService);

  members = toSignal(this.memberService.getAll(), { initialValue: [] as Member[] });
  dues = toSignal(this.duesService.getAll(), { initialValue: [] as Due[] });

  search = signal('');
  filter = signal<'all' | 'active' | 'inactive'>('all');
  readonly filterOptions: Array<'all' | 'active' | 'inactive'> = ['all', 'active', 'inactive'];
  showAddModal = signal(false);

  newName = '';
  newEmail = '';
  newPhone = '';
  newNotes = '';
  addLoading = signal(false);
  addError = signal('');

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    return this.members()
      .filter((m) => {
        const matchFilter =
          this.filter() === 'all' ||
          (this.filter() === 'active' && m.active) ||
          (this.filter() === 'inactive' && !m.active);
        const matchSearch = !q || m.name.toLowerCase().includes(q);
        return matchFilter && matchSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  pendingDuesCount(memberId: string): number {
    return this.dues().filter((d) => d.memberId === memberId && !d.paid).length;
  }

  totalOwed(memberId: string): number {
    return this.dues()
      .filter((d) => d.memberId === memberId && !d.paid)
      .reduce((s, d) => s + d.amount, 0);
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
  }

  openAdd() {
    this.newName = '';
    this.newEmail = '';
    this.newPhone = '';
    this.newNotes = '';
    this.addError.set('');
    this.showAddModal.set(true);
  }

  async addMember() {
    if (!this.newName.trim()) return;
    this.addLoading.set(true);
    this.addError.set('');
    try {
      await this.memberService.add({
        name: this.newName.trim(),
        email: this.newEmail.trim() || undefined,
        phone: this.newPhone.trim() || undefined,
        notes: this.newNotes.trim() || undefined,
      });
      this.showAddModal.set(false);
    } catch {
      this.addError.set('Could not add member. Try again.');
    } finally {
      this.addLoading.set(false);
    }
  }
}
