import { useMemo } from 'react';
import { View } from 'react-native';
import type { HearingRow } from '@/services/hearings';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HearingItem } from './HearingItem';

/** Hearings grouped by court, groups ordered by their earliest hearing (SCR-10, SCR-32: "so I am never in the wrong courtroom"). */
export function HearingGroups({ rows, onUpdate }: { rows: HearingRow[]; onUpdate?: (h: HearingRow) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; rows: HearingRow[] }>();
    for (const r of rows) {
      const key = r.case.courtId;
      const g = map.get(key) ?? { name: r.case.court?.name ?? 'Court not set', rows: [] };
      g.rows.push(r);
      map.set(key, g);
    }
    return [...map.values()];
  }, [rows]);

  return (
    <View>
      {groups.map((g, i) => (
        <View key={g.name} className="gap-3">
          <SectionHeader title={`${g.name} · ${g.rows.length}`} first={i === 0} className="mb-0" />
          {g.rows.map((h) => (
            <HearingItem key={h.id} hearing={h} onUpdate={onUpdate} />
          ))}
        </View>
      ))}
    </View>
  );
}
