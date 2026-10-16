import { fullNameSchema, phoneSchema } from '@vakil/shared';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useCreateClient } from '@/hooks/useClients';
import { isApiError } from '@/services/api';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';

/** FR-CLI-02: create a client without leaving the Add case form. A duplicate phone offers the existing client. */
export function QuickClientSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (clientId: string) => void }) {
  const toast = useToast();
  const create = useCreateClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setPhone('');
      setTouched(false);
    }
  }, [open]);

  const nameOk = fullNameSchema.safeParse(name).success;
  const phoneOk = phoneSchema.safeParse(phone).success;

  const save = async () => {
    setTouched(true);
    if (!nameOk || !phoneOk) return;
    try {
      const c = await create.mutateAsync({ fullName: name.trim(), phone });
      onCreated(c.id);
      onClose();
      toast.show({ type: 'success', message: `${c.fullName} added` });
    } catch (e) {
      if (isApiError(e) && e.code === 'DUPLICATE_PHONE') {
        const existing = e.fields?.phone;
        toast.show({ type: 'info', message: e.message, actionLabel: 'Use them', onAction: () => existing && (onCreated(existing), onClose()) });
      } else toast.show({ type: 'error', message: isApiError(e) ? e.message : 'Could not add the client.' });
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="New client" footer={<Button label="Add client" onPress={save} loading={create.isPending} fullWidth haptic="light" />}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-5 px-5 pb-3">
        <TextField label="Full name" required value={name} onChangeText={setName} error={touched && !nameOk ? 'Enter a name of at least 2 letters' : undefined} placeholder="Client name" autoCapitalize="words" returnKeyType="next" />
        <PhoneInput value={phone} onChangeText={setPhone} error={touched && !phoneOk ? 'Enter a valid 10-digit mobile number' : undefined} returnKeyType="done" onSubmitEditing={save} />
      </ScrollView>
    </BottomSheet>
  );
}
