import { emailSchema, fullNameSchema, phoneSchema } from '@vakil/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { ErrorState } from '@/components/ErrorState';
import { FormScreen } from '@/components/FormScreen';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useClient, useCreateClient, useUpdateClient } from '@/hooks/useClients';
import { isApiError } from '@/services/api';
import { haptic } from '@/utils/haptics';

// SCR-34 Add / edit client (modal). `?id=` switches to edit.
type Values = { fullName: string; phone: string; altPhone: string; email: string; address: string; notes: string };
const EMPTY: Values = { fullName: '', phone: '', altPhone: '', email: '', address: '', notes: '' };

export default function ClientForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const toast = useToast();
  const existing = useClient(id);
  const create = useCreateClient();
  const update = useUpdateClient(id ?? '');

  const [values, setValues] = useState<Values | null>(id ? null : EMPTY);
  const [touched, setTouched] = useState(false);
  const [dupId, setDupId] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const initial = useMemo<Values>(
    () => (existing.data ? { fullName: existing.data.fullName, phone: existing.data.phone, altPhone: existing.data.altPhone ?? '', email: existing.data.email ?? '', address: existing.data.address ?? '', notes: existing.data.notes ?? '' } : EMPTY),
    [existing.data?.id],
  );
  useEffect(() => {
    if (id && existing.data && !values) setValues(initial);
  }, [id, existing.data, values, initial]);

  const v = values ?? EMPTY;
  const set = (p: Partial<Values>) => setValues((x) => ({ ...(x ?? EMPTY), ...p }));
  const dirty = JSON.stringify(v) !== JSON.stringify(id ? initial : EMPTY);

  const errors = {
    fullName: fullNameSchema.safeParse(v.fullName).success ? undefined : 'Enter a name of at least 2 letters',
    phone: phoneSchema.safeParse(v.phone).success ? undefined : 'Enter a valid 10-digit mobile number',
    altPhone: !v.altPhone || phoneSchema.safeParse(v.altPhone).success ? undefined : 'Enter a valid 10-digit mobile number',
    email: !v.email || emailSchema.safeParse(v.email.trim()).success ? undefined : 'Enter a valid email address',
  };
  const invalid = Object.values(errors).some(Boolean);
  const close = () => (dirty ? setConfirmClose(true) : router.back());
  const err = (k: keyof typeof errors) => (touched ? errors[k] : undefined);

  const save = async () => {
    setTouched(true);
    if (invalid) {
      haptic.warning();
      return;
    }
    const input = {
      fullName: v.fullName.trim(),
      phone: v.phone,
      altPhone: v.altPhone || undefined,
      email: v.email.trim() || undefined,
      address: v.address.trim() || undefined,
      notes: v.notes.trim() || undefined,
    };
    try {
      if (id) await update.mutateAsync(input);
      else await create.mutateAsync(input);
      haptic.success();
      toast.show({ type: 'success', message: id ? 'Client updated' : `${input.fullName} added` });
      router.back();
    } catch (e) {
      if (isApiError(e) && e.code === 'DUPLICATE_PHONE') {
        haptic.warning();
        setDupId(e.fields?.phone ?? '');
      } else toast.show({ type: 'error', message: isApiError(e) ? e.message : 'Could not save the client.', actionLabel: 'Retry', onAction: save });
    }
  };

  const title = id ? 'Edit client' : 'New client';

  if (id && existing.isError) {
    return (
      <FormScreen modal onBack={() => router.back()} title={title}>
        <ErrorState error={existing.error} onRetry={() => existing.refetch()} />
      </FormScreen>
    );
  }

  return (
    <FormScreen modal onBack={close} title={title} footer={<Button label={id ? 'Save changes' : 'Add client'} onPress={save} loading={create.isPending || update.isPending} disabled={!!id && !dirty} fullWidth haptic="light" />}>
      {!values ? (
        <View className="gap-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={52} radius={999} />
          ))}
        </View>
      ) : (
        <View className="gap-5">
          <TextField label="Full name" required value={v.fullName} onChangeText={(t) => set({ fullName: t })} error={err('fullName')} placeholder="Client name" autoCapitalize="words" returnKeyType="next" />
          <PhoneInput required value={v.phone} onChangeText={(t) => set({ phone: t })} error={err('phone')} />
          <PhoneInput label="Alternate phone" value={v.altPhone} onChangeText={(t) => set({ altPhone: t })} error={err('altPhone')} />
          <TextField label="Email" value={v.email} onChangeText={(t) => set({ email: t })} error={err('email')} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" />
          <TextArea label="Address" value={v.address} onChangeText={(t) => set({ address: t })} placeholder="Optional" maxLength={300} />
          <TextArea label="Notes" value={v.notes} onChangeText={(t) => set({ notes: t })} placeholder="Anything worth remembering" maxLength={500} />
        </View>
      )}
      <Dialog open={confirmClose} onClose={() => setConfirmClose(false)} title="Discard changes?" message="What you entered will be lost." cancelLabel="Keep editing" confirmLabel="Discard" onConfirm={() => (setConfirmClose(false), router.back())} />
      <Dialog
        open={dupId !== null}
        onClose={() => setDupId(null)}
        variant="confirm"
        title="Number already saved"
        message="A client with this phone number already exists."
        cancelLabel="Change number"
        confirmLabel="Open client"
        onConfirm={() => {
          const t = dupId;
          setDupId(null);
          if (t) router.replace({ pathname: '/client/[id]', params: { id: t } });
        }}
      />
    </FormScreen>
  );
}
