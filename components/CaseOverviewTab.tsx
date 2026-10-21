import { View } from 'react-native';
import { callPhone, whatsAppPhone } from '@/utils/contact';
import { formatShortDate } from '@/utils/date';
import type { CaseDetail } from '@/services/cases';
import { outcomeMap } from '@/components/ui/StatusPill';
import { Card } from '@/components/ui/Card';
import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { CaseOrders } from './CaseOrders';
import { ClientCard } from './ClientCard';
import { useToast } from '@/components/ui/Toast';

/** SCR-19 Overview tab: the facts, the people, and a last-outcome line so you can prepare in seconds. */
export function CaseOverviewTab({ c }: { c: CaseDetail }) {
  const router = useRouter();
  const toast = useToast();
  const last = c.hearings.find((h) => h.completedAt);
  const next = [...c.hearings].filter((h) => !h.completedAt).sort((a, b) => a.date.localeCompare(b.date))[0];

  const contact = async (kind: 'call' | 'wa', phone: string) => {
    const ok = await (kind === 'call' ? callPhone(phone) : whatsAppPhone(phone));
    if (!ok) toast.show({ type: 'error', message: kind === 'call' ? "Can't place calls on this device." : 'WhatsApp is not installed.' });
  };

  return (
    <View className="gap-6">
      {last ? (
        <Card variant="subtle" className="gap-1">
          <Text variant="overline" tone="primary">
            LAST HEARING · {formatShortDate(last.date).toUpperCase()}
          </Text>
          <Text variant="title">{last.outcome ? outcomeMap[last.outcome].label : 'Completed'}</Text>
          {last.outcomeNotes ? (
            <Text variant="body" tone="secondary">
              {last.outcomeNotes}
            </Text>
          ) : null}
        </Card>
      ) : null}

      <View>
        <SectionHeader title="Court" first />
        <Card padded={false} className="px-4">
          <KeyValueRow label="Court" value={c.court?.name} divider />
          <KeyValueRow label="Court room" value={next?.courtRoom ?? c.courtRoom} tabular divider />
          <KeyValueRow label="Judge" value={c.judge} divider />
          {next?.itemNumber ? <KeyValueRow label="Item no." value={next.itemNumber} tabular divider /> : null}
          <KeyValueRow label="Next hearing" value={next ? [formatShortDate(next.date), next.purpose].filter(Boolean).join(' · ') : undefined} divider />
          <KeyValueRow label="Stage" value={c.stage} />
        </Card>
      </View>

      <View>
        <SectionHeader title="Case details" />
        <Card padded={false} className="px-4">
          <KeyValueRow label="Case no." value={[c.caseNumber, c.caseNumber && c.caseYear && !c.caseNumber.includes(String(c.caseYear)) ? `/${c.caseYear}` : ''].join('') || undefined} copyable tabular divider />
          {c.filingNumber && c.filingNumber !== c.caseNumber ? <KeyValueRow label="Filing no." value={c.filingNumber} copyable tabular divider /> : null}
          <KeyValueRow label="Case type" value={c.caseType?.name} divider />
          <KeyValueRow label="CNR" value={c.cnr} copyable tabular divider />
          <KeyValueRow label="Filed" value={c.filingDate ? formatShortDate(c.filingDate) : undefined} divider />
          {c.ecourtsStatus ? <KeyValueRow label="eCourts status" value={c.ecourtsStatus} divider /> : null}
          <KeyValueRow label="Petitioner" value={c.petitioner} divider />
          <KeyValueRow label="Respondent" value={c.respondent} divider={!!c.oppositeCounsel} />
          {c.oppositeCounsel ? <KeyValueRow label="Opposite counsel" value={c.oppositeCounsel} /> : null}
        </Card>
      </View>

      <CaseOrders c={c} />

      <View className="gap-3">
        <SectionHeader title={c.clients.length > 1 ? 'Clients' : 'Client'} />
        {c.clients.length === 0 ? (
          <Text variant="body" tone="secondary">
            No client linked.
          </Text>
        ) : (
          c.clients.map((cl) => (
            <ClientCard
              key={cl.id}
              name={cl.fullName}
              phone={cl.phone}
              onPress={() => router.push({ pathname: '/client/[id]', params: { id: cl.id } })}
              onCall={() => contact('call', cl.phone)}
              onWhatsApp={() => contact('wa', cl.phone)}
            />
          ))
        )}
      </View>

    </View>
  );
}
