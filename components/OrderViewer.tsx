import { IconFileText, IconGavel } from '@tabler/icons-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Modal, View } from 'react-native';
import { errorMessage, isApiError } from '@/services/api';
import { ECOURTS_CASE_STATUS_URL, orderLink } from '@/services/ecourts';
import type { CaseOrder } from '@/services/types';
import { formatShortDate } from '@/utils/date';
import { haptic } from '@/utils/haptics';
import { cachedOrderFile, downloadOrderFile, opensLocalFile, showOrder } from '@/utils/orderFile';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { RingProgress } from './ui/Progress';
import { Text } from './ui/Text';

type Stage = 'asking' | 'court' | 'downloading' | 'ready' | 'error';

const MESSAGES: Record<Exclude<Stage, 'error'>, string> = {
  asking: 'Getting the order from eCourts…',
  court: 'The court is sending this order to eCourts. This can take a minute; keep this open.',
  downloading: 'Downloading the order…',
  ready: 'Opening…',
};

/** How far the bar may creep on its own while waiting (the real download fills the rest). */
const CREEP_CAP: Record<'asking' | 'court', number> = opensLocalFile ? { asking: 0.3, court: 0.6 } : { asking: 0.5, court: 0.9 };
/** Android: progress where the real download starts. */
const DOWNLOAD_FROM = 0.6;

/**
 * Opening a court order: a loader with a percentage until the PDF is fully here, then the
 * phone's PDF viewer. Waits out a court that is slow to send the order to eCourts. An order
 * downloaded before opens at once.
 *
 * Returns `open(order)` and the `viewer` element to render once on the screen.
 */
export function useOpenOrder() {
  const [order, setOrder] = useState<CaseOrder | null>(null);
  const [stage, setStage] = useState<Stage>('asking');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<{ message: string; courtDown: boolean } | null>(null);
  const cancelled = useRef(false);
  const cancelDownload = useRef<(() => Promise<void>) | null>(null);

  // While waiting on eCourts the ring creeps toward its cap, so it never looks stuck.
  useEffect(() => {
    if (!order || (stage !== 'asking' && stage !== 'court')) return;
    const cap = CREEP_CAP[stage];
    const t = setInterval(() => setProgress((p) => (p < cap ? p + (cap - p) * 0.04 : p)), 400);
    return () => clearInterval(t);
  }, [order, stage]);

  const close = () => {
    cancelled.current = true;
    void cancelDownload.current?.();
    cancelDownload.current = null;
    setOrder(null);
  };

  const open = async (o: CaseOrder) => {
    cancelled.current = false;
    setOrder(o);
    setError(null);
    setProgress(0.04);
    setStage('asking');
    const stop = () => cancelled.current;
    let file: string | null = null;
    let url: string | null = null;
    try {
      file = await cachedOrderFile(o.id);
      if (!file) {
        url = await orderLink(o.id, () => !stop() && setStage('court'), stop);
        if (stop()) return;
        if (opensLocalFile) {
          setStage('downloading');
          setProgress((p) => Math.max(p, DOWNLOAD_FROM));
          const dl = downloadOrderFile(url, o.id, (f) => !stop() && setProgress(DOWNLOAD_FROM + (1 - DOWNLOAD_FROM) * f));
          cancelDownload.current = dl.cancel;
          file = await dl.promise;
          cancelDownload.current = null;
        }
      }
      if (stop()) return;
      setProgress(1);
      setStage('ready');
      haptic.success();
      await new Promise((r) => setTimeout(r, 350)); // let the ring reach 100%
      if (stop()) return;
      setOrder(null);
      try {
        await showOrder(file, url);
      } catch {
        // A downloaded file but no PDF viewer: open the link instead.
        await showOrder(null, url ?? (await orderLink(o.id)));
      }
    } catch (e) {
      if (stop() || (isApiError(e) && e.code === 'CANCELLED')) return;
      haptic.warning();
      setStage('error');
      setError({ message: errorMessage(e), courtDown: isApiError(e) && e.code === 'COURT_UNAVAILABLE' });
    }
  };

  const pct = Math.round(progress * 100);
  const isJudgment = order?.kind === 'judgment';

  const viewer = (
    <Modal visible={!!order} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View className="flex-1 items-center justify-center bg-black/60 px-8">
        <View className="w-full max-w-[360px] items-center gap-4 rounded-2xl bg-surface-2 p-6">
          {stage === 'error' ? (
            <>
              <Icon icon={isJudgment ? IconGavel : IconFileText} size={36} tone="error" />
              <Text variant="title" className="text-center">
                {"Couldn't open this order"}
              </Text>
              <Text variant="body-sm" tone="secondary" className="text-center">
                {error?.message}
              </Text>
              <View className="w-full gap-2">
                <Button label="Try again" onPress={() => order && void open(order)} fullWidth />
                {error?.courtDown ? <Button label="Open eCourts website" variant="tonal" onPress={() => void WebBrowser.openBrowserAsync(ECOURTS_CASE_STATUS_URL)} fullWidth /> : null}
                <Button label="Close" variant="ghost" onPress={close} fullWidth />
              </View>
            </>
          ) : (
            <>
              <RingProgress value={progress} size={104} strokeWidth={8} accessibilityLabel={`Loading order, ${pct} percent`}>
                <Text variant="h3" tabular>{`${pct}%`}</Text>
              </RingProgress>
              <View className="items-center gap-1">
                <Text variant="title" className="text-center">
                  {order ? `${isJudgment ? 'Judgment' : 'Order'} · ${formatShortDate(order.date)}` : ''}
                </Text>
                <Text variant="body-sm" tone="secondary" className="text-center">
                  {MESSAGES[stage]}
                </Text>
              </View>
              <Button label="Cancel" variant="ghost" onPress={close} fullWidth />
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  return { open, opening: order?.id ?? null, viewer };
}
