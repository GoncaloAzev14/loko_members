import { Component, inject, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MemberService } from '../../services/member.service';
import { DuesService } from '../../services/dues.service';
import { Due, Member } from '../../models/models';
import { Timestamp } from '@angular/fire/firestore';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
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

  totalUnpaid = computed(() =>
    this.unpaidDues().reduce((sum, d) => sum + d.amount, 0)
  );

  overdueDues = computed(() => {
    const now = Timestamp.now().toMillis();
    return this.unpaidDues()
      .filter((d) => d.dueDate.toMillis() < now)
      .sort((a, b) => a.dueDate.toMillis() - b.dueDate.toMillis())
      .slice(0, 5);
  });

  memberName(memberId: string): string {
    return this.members().find((m) => m.id === memberId)?.name ?? '—';
  }

  formatDate(ts: Timestamp): string {
    return ts.toDate().toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
  }
}
