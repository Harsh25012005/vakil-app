import { IconDownload } from '@tabler/icons-react-native';
import { useState } from 'react';
import { useAdvocate } from '@/hooks/useAuth';
import { errorMessage } from '@/services/api';
import type { HearingRow } from '@/services/hearings';
import { shareTodayHearingsPdf } from '@/utils/hearingsPdf';
import { Button, type ButtonProps } from './ui/Button';
import { useToast } from './ui/Toast';

type Props = Pick<ButtonProps, 'variant' | 'size' | 'fullWidth' | 'className'> & {
  rows: HearingRow[];
  /** 'YYYY-MM-DD' of the list. */
  date: string;
  label?: string;
};

/**
 * Downloads the day's hearings as a PDF (case no., parties, court, room, item no., judge, purpose,
 * client) and opens the share sheet. Always shown, so the option is easy to find; with no hearings
 * it says so.
 */
export function TodayPdfButton({ rows, date, label = "Download today's hearings (PDF)", variant = 'secondary', size = 'md', fullWidth, className }: Props) {
  const toast = useToast();
  const advocate = useAdvocate();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!rows.length) {
      toast.show({ message: 'No hearings are listed today, so there is nothing to download.' });
      return;
    }
    setBusy(true);
    try {
      await shareTodayHearingsPdf(rows, date, advocate?.fullName);
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e), actionLabel: 'Retry', onAction: () => void download() });
    } finally {
      setBusy(false);
    }
  };

  return <Button label={label} variant={variant} size={size} leadingIcon={IconDownload} onPress={() => void download()} loading={busy} fullWidth={fullWidth} className={className} haptic="light" />;
}
