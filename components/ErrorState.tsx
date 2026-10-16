import { IconCloudOff } from '@tabler/icons-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { errorMessage } from '@/services/api';

/** FRS 9.2 "Error (screen)": icon, message, Try again. Used when a screen's main query fails. */
export function ErrorState({ error, onRetry }: { error?: unknown; onRetry: () => void }) {
  return <EmptyState icon={IconCloudOff} title="Couldn't load this" message={error ? errorMessage(error) : 'Check your connection and try again.'} actionLabel="Try again" onAction={onRetry} />;
}
