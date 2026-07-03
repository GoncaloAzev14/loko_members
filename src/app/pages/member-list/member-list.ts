import { Component, inject, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Timestamp } from '@angular/fire/firestore';
import { MemberService, MemberNumberTakenError } from '../../services/member.service';
import { DuesService } from '../../services/dues.service';
import { ClubService } from '../../services/club.service';
import { CsvService, ImportPreview } from '../../services/csv.service';
import { Member, Due, getDueYear } from '../../models/models';
import { I18nService } from '../../services/i18n.service';

type MemberFilter = 'all' | 'active' | 'inactive' | 'unpaid' | 'paid';

@Component({
  selector: 'app-member-list',
  imports: [FormsModule, RouterLink],
  templateUrl: './member-list.html',
  styleUrl: './member-list.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MemberListComponent {
  private route = inject(ActivatedRoute);
  private memberService = inject(MemberService);
  private duesService = inject(DuesService);
  private csvService = inject(CsvService);
  clubService = inject(ClubService);
  i18n = inject(I18nService);

  members = toSignal(this.memberService.getAll(), { initialValue: [] as Member[] });
  dues = toSignal(this.duesService.getAll(), { initialValue: [] as Due[] });

  search = signal('');
  filter = signal<MemberFilter>(this.initialFilter());
  readonly statusFilterOptions: MemberFilter[] = ['all', 'active', 'inactive'];
  readonly duesFilterOptions: MemberFilter[] = ['unpaid', 'paid'];
  showAddModal = signal(false);
  showMoreActions = signal(false);

  newName = '';
  newEmail = '';
  newPhone = '';
  newNotes = '';
  addLoading = signal(false);
  addError = signal('');

  // CSV import state
  importPreview = signal<ImportPreview | null>(null);
  importLoading = signal(false);
  importError = signal('');

  // Bulk-generate yearly dues state
  showBulkGenerate = signal(false);
  bulkYear = signal(new Date().getFullYear());
  bulkAmount = '';
  bulkDescription = '';
  bulkLoading = signal(false);
  bulkError = signal('');
  bulkResult = signal<{ created: number; skipped: number } | null>(null);

  activeMembers = computed(() => this.members().filter((m) => m.active));

  private initialFilter(): MemberFilter {
    const q = this.route.snapshot.queryParamMap.get('filter');
    return q === 'active' || q === 'inactive' || q === 'unpaid' || q === 'paid' ? q : 'all';
  }

  bulkPreview = computed(() => {
    const year = this.bulkYear();
    const dues = this.dues();
    const active = this.activeMembers();
    const eligible = active.filter(
      (m) => !dues.some((d) => d.memberId === m.id && getDueYear(d) === year)
    );
    return { eligible: eligible.length, skipped: active.length - eligible.length };
  });

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    return this.members()
      .filter((m) => {
        const matchFilter =
          this.filter() === 'all' ||
          (this.filter() === 'active' && m.active) ||
          (this.filter() === 'inactive' && !m.active) ||
          (this.filter() === 'unpaid' && this.pendingDuesCount(m.id) > 0) ||
          (this.filter() === 'paid' && this.pendingDuesCount(m.id) === 0);
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

    const name  = this.newName.trim().toLowerCase();
    const email = this.newEmail.trim().toLowerCase();
    const phone = this.newPhone.trim().toLowerCase();

    const duplicate = this.members().some((m) =>
      m.name.toLowerCase() === name &&
      (m.email?.toLowerCase() ?? '') === email &&
      (m.phone?.toLowerCase() ?? '') === phone
    );
    if (duplicate) {
      this.addError.set(this.i18n.t('members.errorDuplicate'));
      return;
    }

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
    } catch (err) {
      this.addError.set(this.parseError(err, this.i18n.t('members.errorAdd')));
    } finally {
      this.addLoading.set(false);
    }
  }

  // ── Bulk-generate yearly dues ───────────────────────────────────────────────

  openBulkGenerate() {
    const year = new Date().getFullYear();
    this.bulkYear.set(year);
    this.bulkAmount = '';
    this.bulkDescription = this.i18n.t('bulkGenerate.defaultDescription', { year: String(year) });
    this.bulkError.set('');
    this.bulkResult.set(null);
    this.showBulkGenerate.set(true);
  }

  async confirmBulkGenerate() {
    const amount = parseFloat(this.bulkAmount);
    const description = this.bulkDescription.trim();
    if (!description || isNaN(amount)) {
      this.bulkError.set(this.i18n.t('memberDetail.errorFillFields'));
      return;
    }

    const year = this.bulkYear();
    const dues = this.dues();
    const eligibleIds = this.activeMembers()
      .filter((m) => !dues.some((d) => d.memberId === m.id && getDueYear(d) === year))
      .map((m) => m.id);
    const skipped = this.activeMembers().length - eligibleIds.length;

    this.bulkLoading.set(true);
    this.bulkError.set('');
    try {
      const dueDate = Timestamp.fromDate(new Date(year, 11, 31));
      const created = await this.duesService.bulkGenerate(eligibleIds, { description, amount, year, dueDate });
      this.bulkResult.set({ created, skipped });
    } catch (err) {
      this.bulkError.set(this.parseError(err, this.i18n.t('bulkGenerate.errorGenerate')));
    } finally {
      this.bulkLoading.set(false);
    }
  }

  private parseError(err: unknown, fallback: string): string {
    if (err instanceof MemberNumberTakenError) {
      return this.i18n.t('members.errorNumberTaken', { number: String(err.number) });
    }
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code: string }).code;
      switch (code) {
        case 'permission-denied':    return this.i18n.t('error.permissionDenied');
        case 'unavailable':
        case 'network-request-failed': return this.i18n.t('error.offline');
        case 'unauthenticated':      return this.i18n.t('error.unauthenticated');
        default: return `${fallback} [${code}]`;
      }
    }
    if (err instanceof Error && err.message) {
      return `${fallback}: ${err.message}`;
    }
    return fallback;
  }

  // ── CSV Export ──────────────────────────────────────────────────────────────

  exportCsv() {
    const csv = this.csvService.exportToCsv(this.members(), this.dues());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members-${this.csvService.toDateStr(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── CSV Import ──────────────────────────────────────────────────────────────

  handleFileImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    (event.target as HTMLInputElement).value = '';

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = this.csvService.parseCsv(content);
      const preview = this.csvService.buildPreview(parsed, this.members(), this.dues());
      this.importError.set('');
      this.importPreview.set(preview);
    };
    reader.readAsText(file);
  }

  get importHasChanges(): boolean {
    const p = this.importPreview();
    if (!p) return false;
    return p.membersToCreate.length + p.membersToUpdate.length + p.duesToCreate.length + p.duesToUpdate.length > 0;
  }

  async confirmImport() {
    const preview = this.importPreview();
    if (!preview) return;
    this.importLoading.set(true);
    this.importError.set('');

    try {
      const newMemberIds = new Map<string, string>();

      for (const pm of preview.membersToCreate) {
        const id = await this.memberService.add({
          name: pm.name,
          email: pm.email,
          phone: pm.phone,
          notes: pm.notes,
          active: pm.active,
          memberNumber: pm.memberNumber,
        });
        newMemberIds.set(pm.email?.toLowerCase() ?? pm.name.toLowerCase(), id);
      }

      for (const { existing, updated } of preview.membersToUpdate) {
        if (updated.memberNumber != null && updated.memberNumber !== existing.memberNumber) {
          await this.memberService.updateMemberNumber(existing.id, updated.memberNumber, existing.memberNumber);
        }
        await this.memberService.update(existing.id, {
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          notes: updated.notes,
          active: updated.active,
        });
      }

      for (const pd of preview.duesToCreate) {
        const key = pd.memberEmail?.toLowerCase() ?? pd.memberName.toLowerCase();
        const memberId =
          newMemberIds.get(key) ??
          this.members().find(
            (m) =>
              (pd.memberEmail ? m.email?.toLowerCase() === pd.memberEmail.toLowerCase() : false) ||
              m.name.toLowerCase() === pd.memberName.toLowerCase(),
          )?.id;
        if (!memberId) continue;

        await this.duesService.addImported({
          memberId,
          description: pd.description,
          amount: pd.amount,
          year: pd.year,
          dueDate: Timestamp.fromDate(pd.dueDate),
          paid: pd.paid,
          paidAt: pd.paidAt ? Timestamp.fromDate(pd.paidAt) : undefined,
        });
      }

      for (const { existing, paid, paidAt } of preview.duesToUpdate) {
        if (paid) {
          await this.duesService.markPaid(existing.id, paidAt ? Timestamp.fromDate(paidAt) : undefined);
        } else {
          await this.duesService.markUnpaid(existing.id);
        }
      }

      this.importPreview.set(null);
    } catch (err) {
      console.error('[MemberList] import failed:', err);
      this.importError.set(this.parseError(err, this.i18n.t('csv.importError')));
    } finally {
      this.importLoading.set(false);
    }
  }
}
