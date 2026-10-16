import { useRouter } from 'expo-router';
import type { HearingRow } from '@/services/hearings';
import { todayISO } from '@/utils/date';
import { HearingCard } from './HearingCard';

/**
 * A HearingCard wired to a HearingRow: derives the state (upcoming / needs update / done) and opens the
 * case on tap. "Update" is delegated to the screen, which owns the outcome sheet.
 */
export function HearingItem({ hearing, onUpdate }: { hearing: HearingRow; onUpdate?: (h: HearingRow) => void }) {
  const router = useRouter();
  const state = hearing.completedAt ? 'done' : hearing.date < todayISO() ? 'needs-update' : 'upcoming';

  return (
    <HearingCard
      caseTitle={hearing.case.title}
      caseNumber={hearing.case.caseNumber}
      time={hearing.time}
      courtRoom={hearing.courtRoom ?? hearing.case.courtRoom}
      stage={hearing.purpose ?? hearing.case.stage}
      lastOutcome={hearing.lastOutcome}
      state={state}
      outcome={hearing.outcome}
      onPress={() => router.push({ pathname: '/case/[id]', params: { id: hearing.caseId } })}
      onUpdate={onUpdate ? () => onUpdate(hearing) : undefined}
    />
  );
}
