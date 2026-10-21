import { IconExternalLink, IconFileText, IconGavel, IconRefresh } from '@tabler/icons-react-native';
import { ActivityIndicator, View } from 'react-native';
import { useCaseOrders, useRefreshFromEcourts } from '@/hooks/useCases';
import { useTheme } from '@/hooks/useTheme';
import { errorMessage } from '@/services/api';
import type { CaseDetail } from '@/services/cases';
import { cn } from '@/utils/cn';
import { formatShortDate } from '@/utils/date';
import { Icon } from './ui/Icon';
import { ListGroup, ListRow } from './ui/ListRow';
import { SectionHeader } from './ui/SectionHeader';
import { Skeleton } from './ui/Skeleton';
import { Text } from './ui/Text';
import { useToast } from './ui/Toast';
import { Button } from './ui/Button';
import { useOpenOrder } from './OrderViewer';

/** Refresh from eCourts with its success / error toast. */
export function useEcourtsRefresh(c: CaseDetail) {
  const toast = useToast();
  const refresh = useRefreshFromEcourts(c.id);
  const run = async () => {
    try {
      await refresh.mutateAsync(c);
      toast.show({ type: 'success', message: 'Updated from eCourts' });
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e), actionLabel: 'Retry', onAction: () => void run() });
    }
  };
  return { run, pending: refresh.isPending };
}

/**
 * Orders and judgments the court uploaded on eCourts. Tapping one shows a loader until the PDF is
 * here, then opens it (OrderViewer). Nothing is copied into Documents.
 */
export function CaseOrders({ c }: { c: CaseDetail }) {
  const { colors } = useTheme();
  const orders = useCaseOrders(c.id);
  const { open, opening, viewer } = useOpenOrder();
  const list = orders.data ?? [];

  return (
    <View>
      <SectionHeader title={list.length ? `Court orders · ${list.length}` : 'Court orders'} />
      {orders.isLoading ? (
        <Skeleton height={56} />
      ) : list.length ? (
        <ListGroup>
          {list.map((o) => (
            <ListRow
              key={o.id}
              title={o.kind === 'judgment' ? 'Judgment' : (o.description ?? 'Order')}
              subtitle={[formatShortDate(o.date), o.kind === 'judgment' && o.description ? o.description : undefined].filter(Boolean).join(' · ')}
              meta={o.lastError === 'COURT_UNAVAILABLE' ? "eCourts couldn't reach the court last time. Tap to try again." : undefined}
              leadingIcon={o.kind === 'judgment' ? IconGavel : IconFileText}
              leadingTone={o.kind === 'judgment' ? 'primary' : 'neutral'}
              trailing={opening === o.id ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon icon={IconExternalLink} size={18} tone="tertiary" />}
              onPress={() => void open(o)}
              accessibilityLabel={`Open ${o.kind === 'judgment' ? 'judgment' : 'order'} of ${formatShortDate(o.date)}`}
            />
          ))}
        </ListGroup>
      ) : (
        <Text variant="body" tone="secondary">
          {c.cnr ? 'No orders on eCourts yet.' : 'Add the CNR number to see court orders from eCourts.'}
        </Text>
      )}
      <EcourtsSyncRow c={c} className="mt-3" />
      {viewer}
    </View>
  );
}

/** Refresh from eCourts (cases with a CNR only). */
export function EcourtsSyncRow({ c, className }: { c: CaseDetail; className?: string }) {
  const refresh = useEcourtsRefresh(c);
  if (!c.cnr) return null;
  return (
    <View className={cn('flex-row justify-end', className)}>
      <Button label="Refresh from eCourts" size="xs" variant="ghost" leadingIcon={IconRefresh} onPress={() => void refresh.run()} loading={refresh.pending} />
    </View>
  );
}
