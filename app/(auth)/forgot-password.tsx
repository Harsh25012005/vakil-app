import { IconMail } from '@tabler/icons-react-native';
import { emailSchema } from '@vakil/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FormScreen } from '@/components/FormScreen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/services/api';
import { requestPasswordReset } from '@/services/auth';

// SCR-05 Forgot password: ask for the email, then go to the reset screen
export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState(params.email ?? '');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid = emailSchema.safeParse(email.trim()).success;

  const submit = async () => {
    setTouched(true);
    if (!valid) return;
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      toast.show({ type: 'success', message: 'If this email is registered, a reset email is on its way.' });
      router.push({ pathname: '/reset-password', params: { email: email.trim() } });
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormScreen avoidKeyboard={false} onBack={() => router.back()} title="Forgot password?" subtitle="Enter your email and we'll send a 6-digit code to reset it.">
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={touched && !valid ? 'Enter a valid email' : undefined}
        leadingIcon={IconMail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <Button label="Send reset code" loading={loading} onPress={submit} fullWidth haptic="light" />
    </FormScreen>
  );
}
