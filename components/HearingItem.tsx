import { useRouter } from 'expo-router';
import type { HearingRow } from '@/services/hearings';
import { HearingCard } from './HearingCard';

/**
 * A HearingCard wired to a HearingRow: done once the court has recorded what happened; opens the
 * case on tap.
 */
export function HearingItem({ hearing }: { hearing: HearingRow }) {
  const router = useRouter();
  const state = hearing.completedAt ? 'done' : 'upcoming';

  return (
    <HearingCard
      caseTitle={hearing.case.title}
      caseNumber={hearing.case.caseNumber}
      time={hearing.time}
      courtRoom={hearing.courtRoom ?? hearing.case.courtRoom}
      itemNumber={hearing.itemNumber}
      judge={hearing.case.judge}
      stage={hearing.purpose ?? hearing.case.stage}
      lastOutcome={hearing.lastOutcome}
      state={state}
      outcome={hearing.outcome}
      onPress={() => router.push({ pathname: '/case/[id]', params: { id: hearing.caseId } })}
    />
  );
}
