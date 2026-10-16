import type { CaseStatusKind } from '@/components/ui/StatusPill';
import type { CaseRow } from '@/services/cases';
import { toISODate, today } from '@/utils/date';

/** Maps a case to the status pill it should show (FRS 2.5). Overdue is handled separately by the card. */
export function caseStatusKind(c: Pick<CaseRow, 'status' | 'nextHearingAt' | 'archivedAt'>): CaseStatusKind {
  if (c.archivedAt) return 'archived';
  if (c.status === 'reserved') return 'reserved';
  if (c.status === 'disposed') return 'disposed';
  if (c.status === 'closed') return 'closed';
  return c.nextHearingAt === toISODate(today()) ? 'today' : 'active';
}
