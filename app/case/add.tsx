import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { CaseFormFields } from '@/components/CaseFormFields';
import { FormScreen } from '@/components/FormScreen';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { useCaseDraft } from '@/hooks/useCaseDraft';
import { useCreateCase } from '@/hooks/useCases';
import { errorMessage } from '@/services/api';
import { toNewCase, validateCase, type CaseFormErrors } from '@/utils/caseForm';
import { toISODate, today } from '@/utils/date';
import { haptic } from '@/utils/haptics';

// SCR-14 Add case: one short form. Everything else is added later from the case itself.
export default function AddCase() {
  const router = useRouter();
  const toast = useToast();
  const draft = useCaseDraft();
  const { values } = draft;
  const create = useCreateCase();

  const [errors, setErrors] = useState<CaseFormErrors>({});
  const [confirmClose, setConfirmClose] = useState(false);

  // Filing date defaults to today (auto-selected), but can be changed.
  useEffect(() => {
    if (!values.filingDate) draft.set({ filingDate: toISODate(today()) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (patch: Partial<typeof values>) => {
    draft.set(patch);
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in patch))));
  };

  const close = () => (draft.isDirty() ? setConfirmClose(true) : router.back());

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  });

  const save = async () => {
    const e = validateCase(values);
    if (Object.keys(e).length) {
      setErrors(e);
      haptic.warning();
      return;
    }
    try {
      const saved = await create.mutateAsync(toNewCase(values));
      draft.remember(values);
      draft.reset(true);
      haptic.success();
      toast.show({ type: 'success', message: `${saved.title} saved` });
      router.replace({ pathname: '/case/[id]', params: { id: saved.id } });
    } catch (err) {
      toast.show({ type: 'error', message: errorMessage(err), actionLabel: 'Retry', onAction: save });
    }
  };

  const discard = () => {
    draft.reset(true);
    setConfirmClose(false);
    router.back();
  };

  return (
    <FormScreen modal avoidKeyboard={false} onBack={close} title="Add case" subtitle="All fields are required. Add hearings and notes from the case afterwards." footer={<Button label="Save case" onPress={save} loading={create.isPending} fullWidth haptic="light" />}>
      <CaseFormFields values={values} errors={errors} onChange={set} />
      <Dialog open={confirmClose} onClose={() => setConfirmClose(false)} title="Discard this case?" message="Your draft is saved. Keep it to finish later, or discard it." cancelLabel="Keep draft" confirmLabel="Discard" onConfirm={discard} />
    </FormScreen>
  );
}
