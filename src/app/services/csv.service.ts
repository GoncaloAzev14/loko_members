import { Injectable } from '@angular/core';
import { Member, Due } from '../models/models';

export interface ParsedMember {
  name: string;
  email?: string;
  phone?: string;
  active: boolean;
  notes?: string;
}

export interface ParsedDue {
  memberName: string;
  memberEmail?: string;
  description: string;
  amount: number;
  dueDate: Date;
  paid: boolean;
  paidAt?: Date;
}

export interface MemberUpdate {
  existing: Member;
  updated: ParsedMember;
}

export interface DueUpdate {
  existing: Due;
  paid: boolean;
  paidAt?: Date;
}

export interface ImportPreview {
  membersToCreate: ParsedMember[];
  membersToUpdate: MemberUpdate[];
  duesToCreate: ParsedDue[];
  duesToUpdate: DueUpdate[];
  parseErrors: string[];
}

@Injectable({ providedIn: 'root' })
export class CsvService {
  static readonly HEADERS = [
    'member_name',
    'member_email',
    'member_phone',
    'member_active',
    'member_notes',
    'due_description',
    'due_amount',
    'due_date',
    'due_paid',
    'due_paid_at',
  ] as const;

  exportToCsv(members: Member[], dues: Due[]): string {
    const lines: string[] = [CsvService.HEADERS.join(',')];

    for (const m of [...members].sort((a, b) => a.name.localeCompare(b.name))) {
      const memberDues = [...dues.filter((d) => d.memberId === m.id)].sort(
        (a, b) => a.dueDate.toMillis() - b.dueDate.toMillis(),
      );
      if (memberDues.length === 0) {
        lines.push(this.memberRow(m, null));
      } else {
        for (const d of memberDues) lines.push(this.memberRow(m, d));
      }
    }

    return lines.join('\n');
  }

  private memberRow(m: Member, d: Due | null): string {
    return [
      this.esc(m.name),
      this.esc(m.email ?? ''),
      this.esc(m.phone ?? ''),
      m.active ? 'true' : 'false',
      this.esc(m.notes ?? ''),
      d ? this.esc(d.description) : '',
      d ? d.amount.toFixed(2) : '',
      d ? this.toDateStr(d.dueDate.toDate()) : '',
      d ? (d.paid ? 'true' : 'false') : '',
      d?.paidAt ? this.toDateStr(d.paidAt.toDate()) : '',
    ].join(',');
  }

  parseCsv(content: string): { members: ParsedMember[]; dues: ParsedDue[]; errors: string[] } {
    const errors: string[] = [];
    const rows = this.parseRows(content);

    if (rows.length < 2) return { members: [], dues: [], errors: ['No data rows found'] };

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const missing = CsvService.HEADERS.filter((h) => !headers.includes(h));
    if (missing.length) return { members: [], dues: [], errors: [`Missing columns: ${missing.join(', ')}`] };

    const col = (row: string[], name: string) => (row[headers.indexOf(name)] ?? '').trim();
    const memberMap = new Map<string, ParsedMember>();
    const dues: ParsedDue[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.every((c) => !c.trim())) continue;

      const name = col(row, 'member_name');
      if (!name) { errors.push(`Row ${i + 1}: missing member_name, skipped`); continue; }

      const email = col(row, 'member_email') || undefined;
      const memberKey = email?.toLowerCase() ?? name.toLowerCase();

      if (!memberMap.has(memberKey)) {
        memberMap.set(memberKey, {
          name,
          email,
          phone: col(row, 'member_phone') || undefined,
          active: col(row, 'member_active').toLowerCase() !== 'false',
          notes: col(row, 'member_notes') || undefined,
        });
      }

      const desc = col(row, 'due_description');
      const amtStr = col(row, 'due_amount');
      const dateStr = col(row, 'due_date');

      if (desc && amtStr && dateStr) {
        const amount = parseFloat(amtStr);
        const dueDate = new Date(dateStr);
        if (isNaN(amount)) { errors.push(`Row ${i + 1}: invalid amount "${amtStr}", due skipped`); continue; }
        if (isNaN(dueDate.getTime())) { errors.push(`Row ${i + 1}: invalid date "${dateStr}", due skipped`); continue; }

        const paidAtStr = col(row, 'due_paid_at');
        const paidAt = paidAtStr ? new Date(paidAtStr) : undefined;

        dues.push({
          memberName: name,
          memberEmail: email,
          description: desc,
          amount,
          dueDate,
          paid: col(row, 'due_paid').toLowerCase() === 'true',
          paidAt: paidAt && !isNaN(paidAt.getTime()) ? paidAt : undefined,
        });
      }
    }

    return { members: Array.from(memberMap.values()), dues, errors };
  }

  buildPreview(
    parsed: ReturnType<CsvService['parseCsv']>,
    existingMembers: Member[],
    existingDues: Due[],
  ): ImportPreview {
    const byEmail = new Map(
      existingMembers.filter((m) => m.email).map((m) => [m.email!.toLowerCase(), m]),
    );
    const byName = new Map(existingMembers.map((m) => [m.name.toLowerCase(), m]));

    const membersToCreate: ParsedMember[] = [];
    const membersToUpdate: MemberUpdate[] = [];
    const resolvedIds = new Map<string, string>();

    for (const pm of parsed.members) {
      const key = pm.email?.toLowerCase() ?? pm.name.toLowerCase();
      const existing =
        (pm.email ? byEmail.get(pm.email.toLowerCase()) : undefined) ??
        byName.get(pm.name.toLowerCase());

      if (existing) {
        resolvedIds.set(key, existing.id);
        const differs =
          existing.name !== pm.name ||
          (existing.email ?? '') !== (pm.email ?? '') ||
          (existing.phone ?? '') !== (pm.phone ?? '') ||
          existing.active !== pm.active ||
          (existing.notes ?? '') !== (pm.notes ?? '');
        if (differs) membersToUpdate.push({ existing, updated: pm });
      } else {
        membersToCreate.push(pm);
      }
    }

    const duesToCreate: ParsedDue[] = [];
    const duesToUpdate: DueUpdate[] = [];

    for (const pd of parsed.dues) {
      const key = pd.memberEmail?.toLowerCase() ?? pd.memberName.toLowerCase();
      const existingId = resolvedIds.get(key);

      if (!existingId) {
        duesToCreate.push(pd);
        continue;
      }

      const match = existingDues
        .filter((d) => d.memberId === existingId)
        .find(
          (d) =>
            d.description === pd.description &&
            this.toDateStr(d.dueDate.toDate()) === this.toDateStr(pd.dueDate),
        );

      if (match) {
        if (match.paid !== pd.paid) duesToUpdate.push({ existing: match, paid: pd.paid, paidAt: pd.paidAt });
      } else {
        duesToCreate.push(pd);
      }
    }

    return { membersToCreate, membersToUpdate, duesToCreate, duesToUpdate, parseErrors: parsed.errors };
  }

  private parseRows(content: string): string[][] {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => this.parseLine(l));
  }

  private parseLine(line: string): string[] {
    const fields: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let val = '';
        i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { val += line[i++]; }
        }
        fields.push(val);
        if (line[i] === ',') i++;
      } else {
        const end = line.indexOf(',', i);
        if (end === -1) { fields.push(line.slice(i)); break; }
        fields.push(line.slice(i, end));
        i = end + 1;
      }
    }
    return fields;
  }

  private esc(v: string): string {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`;
    return v;
  }

  toDateStr(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
