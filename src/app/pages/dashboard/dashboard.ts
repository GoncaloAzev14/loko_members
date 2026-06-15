import { Component, inject, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MemberService } from '../../services/member.service';
import { DuesService } from '../../services/dues.service';
import { Due, Member } from '../../models/models';
import { Timestamp } from '@angular/fire/firestore';
import { I18nService } from '../../services/i18n.service';

interface DebtorEntry {
  member: Member;
  totalDebt: number;
  dueCount: number;
  latestDueDate: Timestamp;
  oldestDueDate: Timestamp;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DashboardComponent {
  private memberService = inject(MemberService);
  private duesService = inject(DuesService);
  i18n = inject(I18nService);

  members = toSignal(this.memberService.getAll(), { initialValue: [] as Member[] });
  dues = toSignal(this.duesService.getAll(), { initialValue: [] as Due[] });

  activeMembers = computed(() => this.members().filter((m) => m.active));
  unpaidDues = computed(() => this.dues().filter((d) => !d.paid));
  totalUnpaid = computed(() => this.unpaidDues().reduce((sum, d) => sum + d.amount, 0));

  searchQuery = signal('');
  sortMode = signal<'recent' | 'old' | 'name'>('recent');

  private memberMap = computed(() =>
    new Map<string, Member>(this.members().map((m) => [m.id, m]))
  );

  debtors = computed<DebtorEntry[]>(() => {
    const byMember = new Map<string, Due[]>();
    for (const due of this.unpaidDues()) {
      const list = byMember.get(due.memberId) ?? [];
      list.push(due);
      byMember.set(due.memberId, list);
    }

    const entries: DebtorEntry[] = [];
    for (const [memberId, dues] of byMember) {
      const member = this.memberMap().get(memberId);
      if (!member) continue;
      const sorted = [...dues].sort((a, b) => a.dueDate.toMillis() - b.dueDate.toMillis());
      entries.push({
        member,
        totalDebt: dues.reduce((s, d) => s + d.amount, 0),
        dueCount: dues.length,
        oldestDueDate: sorted[0].dueDate,
        latestDueDate: sorted[sorted.length - 1].dueDate,
      });
    }
    return entries;
  });

  filteredDebtors = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const sort = this.sortMode();

    let list = this.debtors();
    if (q) {
      list = list.filter(({ member }) =>
        member.name.toLowerCase().includes(q) ||
        (member.email ?? '').toLowerCase().includes(q) ||
        (member.phone ?? '').toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      switch (sort) {
        case 'recent': return b.latestDueDate.toMillis() - a.latestDueDate.toMillis();
        case 'old':    return a.oldestDueDate.toMillis() - b.oldestDueDate.toMillis();
        case 'name':   return a.member.name.localeCompare(b.member.name);
      }
    });
  });

  formatCurrency(amount: number): string {
    return amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
  }
}
