import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { CaseFormFields } from '@/components/CaseFormFields';
import { ErrorState } from '@/components/ErrorState';
import { FormScreen } from '@/components/FormScreen';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useCase, useUpdateCase } from '@/hooks/useCases';
import { errorMessage } from '@/services/api';
import { formFromCase, toCasePatch, validateCase, type CaseFormErrors, type CaseFormValues } from '@/utils/caseForm';
import { haptic } from '@/utils/haptics';

// SCR-25 Edit case: every field on one scroll
export default function EditCase() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const q = useCase(id);
  const update = useUpdateCase(id ?? '');

  const [values, setValues] = useState<CaseFormValues | null>(null);
  const [errors, setErrors] = useState<CaseFormErrors>({});
  const [confirmClose, setConfirmClose] = useState(false);
  const initial = useMemo(() => (q.data ? formFromCase(q.data) : null), [q.data?.id]);

  useEffect(() => {
    if (initial && !values) setValues(initial);
  }, [initial, values]);

  const dirty = !!values && !!initial && JSON.stringify(values) !== JSON.stringify(initial);
  const close = () => (dirty ? setConfirmClose(true) : router.back());

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  });

  const set = (patch: Partial<CaseFormValues>) => {
    setValues((v) => (v ? { ...v, ...patch } : v));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in patch))));
  };

  const save = async () => {
    if (!values) return;
    const e = validateCase(values);
    if (Object.keys(e).length) {
      setErrors(e);
      haptic.warning();
      toast.show({ type: 'error', message: 'Please fix the highlighted fields.' });
      return;
    }
    try {
      await update.mutateAsync(toCasePatch(values));
      haptic.success();
      toast.show({ type: 'success', message: 'Case updated' });
      router.back();
    } catch (err) {
      toast.show({ type: 'error', message: errorMessage(err), actionLabel: 'Retry', onAction: save });
    }
  };

  if (q.isError) {
    return (
      <FormScreen onBack={() => router.back()} title="Edit case">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </FormScreen>
    );
  }

  return (
    <FormScreen modal onBack={close} title="Edit case" footer={<Button label="Save changes" onPress={save} loading={update.isPending} disabled={!dirty} fullWidth haptic="light" />}>
      {!values ? (
        <View className="gap-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={52} radius={999} />
          ))}
        </View>
      ) : (
        <CaseFormFields values={values} errors={errors} onChange={set} />
      )}
      <Dialog open={confirmClose} onClose={() => setConfirmClose(false)} title="Discard changes?" message="Your edits to this case will be lost." cancelLabel="Keep editing" confirmLabel="Discard" onConfirm={() => (setConfirmClose(false), router.back())} />
    </FormScreen>
  );
}
