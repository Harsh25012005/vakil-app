import { IconBuildingBank } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { CaseFormFields } from '@/components/CaseFormFields';
import { courtMeta } from '@/components/CourtPicker';
import { FormScreen } from '@/components/FormScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InfoTag } from '@/components/ui/InfoTag';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useCaseDraft } from '@/hooks/useCaseDraft';
import { useCaseSearch } from '@/hooks/useCaseSearch';
import { useCreateCase } from '@/hooks/useCases';
import { errorMessage } from '@/services/api';
import { toNewCase, validateCase, type CaseFormErrors } from '@/utils/caseForm';
import { toISODate, today } from '@/utils/date';
import { haptic } from '@/utils/haptics';

// SCR-14 Add case, step 3: the details eCourts filled in (or a blank form), checked and saved.
// "Save & add another" goes back to step 1 with the same court.
export default function AddCaseReview() {
  const router = useRouter();
  const toast = useToast();
  const draft = useCaseDraft();
  const { values } = draft;
  const court = draft.lastDirectoryCourt;
  const fetched = useCaseSearch((s) => s.fetched);
  const clearSearch = useCaseSearch((s) => s.clear);
  const create = useCreateCase();
  const [errors, setErrors] = useState<CaseFormErrors>({});

  // Filing date defaults to today, but can be changed.
  useEffect(() => {
    if (!values.filingDate) draft.set({ filingDate: toISODate(today()) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.filingDate]);

  const set = (patch: Partial<typeof values>) => {
    draft.set(patch);
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in patch))));
  };

  const save = async (another: boolean) => {
    const e = validateCase(values);
    if (Object.keys(e).length) {
      setErrors(e);
      haptic.warning();
      toast.show({ type: 'error', message: 'Fill in the highlighted fields.' });
      return;
    }
    try {
      const saved = await create.mutateAsync(toNewCase(values));
      draft.remember(values);
      draft.reset(true);
      clearSearch();
      haptic.success();
      if (another) {
        toast.show({ type: 'success', message: `${saved.title} saved. Add the next one.`, actionLabel: 'Open', onAction: () => router.push({ pathname: '/case/[id]', params: { id: saved.id } }) });
        router.dismissAll(); // back to step 1, court still picked
        return;
      }
      toast.show({ type: 'success', message: `${saved.title} saved` });
      // Replaces the whole Add case modal with the new case.
      router.replace({ pathname: '/case/[id]', params: { id: saved.id } });
    } catch (err) {
      toast.show({ type: 'error', message: errorMessage(err), actionLabel: 'Retry', onAction: () => void save(another) });
    }
  };

  return (
    <FormScreen
      onBack={() => router.back()}
      avoidKeyboard={false}
      eyebrow="Step 3 of 3"
      title="Check and save"
      subtitle={fetched ? 'Filled from eCourts. Check the details, add a client if you like, and save.' : 'Fill in the case details. Add hearings and notes from the case afterwards.'}
      footer={
        <View className="gap-2">
          <Button label="Save case" onPress={() => void save(false)} loading={create.isPending} fullWidth haptic="light" />
          <Button label="Save & add another" variant="tonal" onPress={() => void save(true)} disabled={create.isPending} fullWidth />
        </View>
      }
    >
      {court ? (
        <Card variant="flat" className="gap-0.5">
          <InfoTag icon={IconBuildingBank} label={court.name} tone="default" />
          <Text variant="caption" tone="tertiary" className="pl-[22px]">
            {courtMeta(court)}
          </Text>
        </Card>
      ) : null}
      <CaseFormFields key={fetched?.cnr ?? 'manual'} mode="add" values={values} errors={errors} onChange={set} initialFetched={fetched} keepCourt={!!court} court={court} />
    </FormScreen>
  );
}
