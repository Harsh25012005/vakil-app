import { IconBrandWhatsapp, IconBriefcaseOff, IconMessage, IconPencil, IconPhone, IconTrash } from '@tabler/icons-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaseCard } from '@/components/CaseCard';
import { ErrorState } from '@/components/ErrorState';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useToast } from '@/components/ui/Toast';
import { useClient, useDeleteClient } from '@/hooks/useClients';
import { errorMessage, isApiError } from '@/services/api';
import { caseStatusKind } from '@/utils/caseStatus';
import { callPhone, smsPhone, whatsAppPhone } from '@/utils/contact';
import { formatPhone } from '@/utils/format';

// SCR-35 Client detail
export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const q = useClient(id);
  const del = useDeleteClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const c = q.data;

  const reach = async (fn: () => Promise<boolean>) => {
    if (!(await fn())) toast.show({ type: 'error', message: 'Could not open the app on this device.' });
  };

  const bar = (
    <TopAppBar
      title=""
      onBack={() => router.back()}
      actions={
        c ? (
          <>
            <IconButton icon={IconPencil} accessibilityLabel="Edit client" onPress={() => router.push({ pathname: '/client/add', params: { id: c.id } })} />
            <IconButton icon={IconTrash} accessibilityLabel="Delete client" onPress={() => setConfirmDelete(true)} />
          </>
        ) : undefined
      }
    />
  );

  if (q.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        {bar}
        <View className="items-center gap-4 px-5 pt-2">
          <Skeleton width={72} height={72} radius={999} />
          <Skeleton width="50%" height={24} />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (q.isError || !c) {
    const missing = isApiError(q.error) && q.error.status === 404;
    return (
      <View className="flex-1 bg-bg">
        {bar}
        {missing ? <EmptyState icon={IconBriefcaseOff} title="Client not found" message="They may have been deleted." actionLabel="Back to clients" onAction={() => router.replace('/clients')} /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      </View>
    );
  }

  const remove = async () => {
    try {
      await del.mutateAsync(c.id);
      setConfirmDelete(false);
      toast.show({ type: 'success', message: `${c.fullName} deleted` });
      router.back();
    } catch (e) {
      setConfirmDelete(false);
      toast.show({ type: 'error', message: errorMessage(e) });
    }
  };

  return (
    <View className="flex-1 bg-bg">
      {bar}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} contentContainerClassName="gap-5 px-5 pt-1">
        <View className="items-center gap-2">
          <Avatar name={c.fullName} size={80} />
          <Text variant="h2" accessibilityRole="header" className="text-center" selectable>
            {c.fullName}
          </Text>
          <Text variant="body" tone="secondary" tabular selectable>
            {`+91 ${formatPhone(c.phone)}`}
          </Text>
        </View>

        <View className="flex-row gap-3">
          <Button label="Call" leadingIcon={IconPhone} size="md" className="flex-1" fullWidth onPress={() => reach(() => callPhone(c.phone))} />
          <Button label="WhatsApp" variant="secondary" leadingIcon={IconBrandWhatsapp} size="md" className="flex-1" fullWidth onPress={() => reach(() => whatsAppPhone(c.phone))} />
          <IconButton icon={IconMessage} accessibilityLabel="Send SMS" variant="tonal" size="lg" onPress={() => reach(() => smsPhone(c.phone))} />
        </View>

        <Card className="gap-1">
          <KeyValueRow label="Phone" value={`+91 ${formatPhone(c.phone)}`} copyable divider />
          <KeyValueRow label="Alternate" value={c.altPhone ? `+91 ${formatPhone(c.altPhone)}` : undefined} copyable divider />
          <KeyValueRow label="Email" value={c.email} copyable divider />
          <KeyValueRow label="Address" value={c.address} />
        </Card>

        {c.notes ? (
          <View className="gap-2">
            <SectionHeader title="Notes" first />
            <Text variant="body" selectable>
              {c.notes}
            </Text>
          </View>
        ) : null}

        <View className="gap-3">
          <SectionHeader title={`Cases · ${c.cases.length}`} first />
          {c.cases.length === 0 ? (
            <Text variant="body" tone="secondary">
              No cases linked yet.
            </Text>
          ) : (
            c.cases.map((k) => (
              <CaseCard
                key={k.id}
                title={k.title}
                caseNumber={k.caseNumber}
                court={k.court?.name ?? 'Court not set'}
                nextDate={k.nextHearingAt}
                status={caseStatusKind(k)}
                overdue={k.overdue}
                onPress={() => router.push({ pathname: '/case/[id]', params: { id: k.id } })}
              />
            ))
          )}
        </View>
      </ScrollView>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        variant={c.activeCaseCount > 0 ? 'info' : 'destructive'}
        title={c.activeCaseCount > 0 ? "Can't delete yet" : 'Delete client?'}
        message={c.activeCaseCount > 0 ? `${c.fullName} has ${c.activeCaseCount} active ${c.activeCaseCount === 1 ? 'case' : 'cases'}, so they can't be deleted yet.` : `${c.fullName} will be removed from your clients and unlinked from their cases.`}
        confirmLabel={c.activeCaseCount > 0 ? 'Got it' : 'Delete'}
        cancelLabel="Cancel"
        loading={del.isPending}
        onConfirm={c.activeCaseCount > 0 ? () => setConfirmDelete(false) : remove}
      />
    </View>
  );
}
