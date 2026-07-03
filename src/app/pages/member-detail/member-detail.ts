import { Component, inject, signal, computed, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MemberService, MemberNumberTakenError } from '../../services/member.service';
import { DuesService } from '../../services/dues.service';
import { ClubService } from '../../services/club.service';
import { Member, Due, getDueYear } from '../../models/models';
import { Timestamp } from '@angular/fire/firestore';
import { map } from 'rxjs';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-member-detail',
  imports: [FormsModule],
  templateUrl: './member-detail.html',
  styleUrl: './member-detail.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MemberDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private memberService = inject(MemberService);
  private duesService = inject(DuesService);
  clubService = inject(ClubService);
  i18n = inject(I18nService);

  memberId = this.route.snapshot.paramMap.get('id')!;

  members = toSignal(this.memberService.getAll(), { initialValue: [] as Member[] });
  member = computed(() => this.members().find((m) => m.id === this.memberId) ?? null);
  dues = toSignal(
    this.duesService.getForMember(this.memberId),
    { initialValue: [] as Due[] }
  );

  unpaidDues = computed(() => this.dues().filter((d) => !d.paid).sort((a, b) => a.dueDate.toMillis() - b.dueDate.toMillis()));
  paidDues = computed(() => this.dues().filter((d) => d.paid).sort((a, b) => b.paidAt!.toMillis() - a.paidAt!.toMillis()));

  // Edit member
  editing = signal(false);
  editName = '';
  editEmail = '';
  editPhone = '';
  editNotes = '';
  editMemberNumber: number | null = null;
  editLoading = signal(false);
  editError = signal('');

  // Add due
  showAddDue = signal(false);
  dueDesc = '';
  dueAmount = '';
  dueYear = new Date().getFullYear();
  addDueLoading = signal(false);
  addDueError = signal('');

  confirmDeleteId = signal<string | null>(null);

  copiedField = signal<'phone' | 'email' | null>(null);

  async copyToClipboard(text: string, field: 'phone' | 'email') {
    try {
      await navigator.clipboard.writeText(text);
      this.copiedField.set(field);
      setTimeout(() => {
        if (this.copiedField() === field) this.copiedField.set(null);
      }, 1500);
    } catch {
      // Clipboard API unavailable/blocked — nothing sensible to recover to, just skip the feedback.
    }
  }

  ngOnInit() {
    const m = this.member();
    if (m) this.resetEdit(m);
  }

  resetEdit(m: Member) {
    this.editName = m.name;
    this.editEmail = m.email ?? '';
    this.editPhone = m.phone ?? '';
    this.editNotes = m.notes ?? '';
    this.editMemberNumber = m.memberNumber ?? null;
  }

  startEdit() {
    const m = this.member();
    if (m) this.resetEdit(m);
    this.editError.set('');
    this.editing.set(true);
  }

  async saveEdit() {
    const m = this.member();
    if (!m) return;

    let newNumber: number | undefined;
    if (this.editMemberNumber != null) {
      newNumber = this.editMemberNumber;
      if (!Number.isInteger(newNumber) || newNumber < 1) {
        this.editError.set(this.i18n.t('members.errorInvalidNumber'));
        return;
      }
    }

    this.editLoading.set(true);
    this.editError.set('');
    try {
      if (newNumber !== undefined && newNumber !== m.memberNumber) {
        await this.memberService.updateMemberNumber(this.memberId, newNumber, m.memberNumber);
      }
      await this.memberService.update(this.memberId, {
        name: this.editName.trim(),
        email: this.editEmail.trim() || undefined,
        phone: this.editPhone.trim() || undefined,
        notes: this.editNotes.trim() || undefined,
      });
      this.editing.set(false);
    } catch (err) {
      this.editError.set(this.parseError(err, this.i18n.t('memberDetail.errorSave')));
    } finally {
      this.editLoading.set(false);
    }
  }

  async toggleActive() {
    const m = this.member();
    if (!m) return;
    await this.memberService.update(this.memberId, { active: !m.active });
  }

  async markPaid(dueId: string) {
    await this.duesService.markPaid(dueId);
  }

  async markUnpaid(dueId: string) {
    await this.duesService.markUnpaid(dueId);
  }

  async deleteDue(dueId: string) {
    await this.duesService.remove(dueId);
    this.confirmDeleteId.set(null);
  }

  openAddDue() {
    this.dueDesc = '';
    this.dueAmount = '';
    this.dueYear = new Date().getFullYear();
    this.addDueError.set('');
    this.showAddDue.set(true);
  }

  async addDue() {
    const amount = parseFloat(this.dueAmount);
    if (!this.dueDesc.trim() || isNaN(amount) || !this.dueYear) {
      this.addDueError.set(this.i18n.t('memberDetail.errorFillFields'));
      return;
    }
    const duplicate = this.dues().some((d) => getDueYear(d) === this.dueYear);
    if (duplicate) {
      this.addDueError.set(this.i18n.t('memberDetail.errorDuplicateYear', { year: String(this.dueYear) }));
      return;
    }
    this.addDueLoading.set(true);
    this.addDueError.set('');
    try {
      await this.duesService.add({
        memberId: this.memberId,
        description: this.dueDesc.trim(),
        amount,
        year: this.dueYear,
        dueDate: Timestamp.fromDate(new Date(this.dueYear, 11, 31)),
      });
      this.showAddDue.set(false);
    } catch (err) {
      this.addDueError.set(this.parseError(err, this.i18n.t('memberDetail.errorAddDue')));
    } finally {
      this.addDueLoading.set(false);
    }
  }

  private parseError(err: unknown, fallback: string): string {
    if (err instanceof MemberNumberTakenError) {
      return this.i18n.t('members.errorNumberTaken', { number: String(err.number) });
    }
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code: string }).code;
      switch (code) {
        case 'permission-denied':      return this.i18n.t('error.permissionDenied');
        case 'unavailable':
        case 'network-request-failed': return this.i18n.t('error.offline');
        case 'unauthenticated':        return this.i18n.t('error.unauthenticated');
        default: return `${fallback} [${code}]`;
      }
    }
    if (err instanceof Error && err.message) {
      return `${fallback}: ${err.message}`;
    }
    return fallback;
  }

  formatDate(ts: Timestamp): string {
    return ts.toDate().toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
  }

  isOverdue(due: Due): boolean {
    return !due.paid && due.dueDate.toMillis() < Date.now();
  }

  goBack() {
    this.router.navigate(['/members']);
  }
}
