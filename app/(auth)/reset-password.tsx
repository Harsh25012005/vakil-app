import { IconEye, IconEyeOff, IconLock } from '@tabler/icons-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import { FormScreen } from '@/components/FormScreen';
import { Button } from '@/components/ui/Button';
import { LinkText } from '@/components/ui/LinkText';
import { OtpInput } from '@/components/ui/OtpInput';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/services/api';
import { requestPasswordReset, resetPassword, resetPasswordFromLink } from '@/services/auth';

// SCR-05b Reset password: the 6-digit code from the email, then a new password.
// Opening the link in the email on this phone lands here with ?code= instead, and the code step is skipped.
const RESEND_SECONDS = 30;
const CODE_LENGTH = 6;

export default function ResetPassword() {
  const { email = '', code: linkCode } = useLocalSearchParams<{ email?: string; code?: string }>();
  const router = useRouter();
  const toast = useToast();
  const confirmRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const errors = {
    code: linkCode || code.length === CODE_LENGTH ? undefined : `Enter the ${CODE_LENGTH}-digit code`,
    password: password.length >= 8 ? undefined : 'Password must be at least 8 characters',
    confirm: confirm === password ? undefined : 'Passwords do not match',
  };

  const submit = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setLoading(true);
    try {
      if (linkCode) await resetPasswordFromLink(linkCode, password);
      else await resetPassword(email, code, password);
      toast.show({ type: 'success', message: 'Password updated. Sign in with your new password.' });
      router.replace('/sign-in');
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await requestPasswordReset(email);
      setSeconds(RESEND_SECONDS);
      toast.show({ type: 'success', message: 'A new code is on its way.' });
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    }
  };

  return (
    <FormScreen
      avoidKeyboard={false}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}
      title="Reset password"
      subtitle={linkCode ? 'Choose a new password for your account.' : `Enter the code we sent to ${email} and choose a new password.`}
    >
      {linkCode ? null : (
        <View className="gap-2">
          <OtpInput value={code} onChange={setCode} length={CODE_LENGTH} autoFocus={false} error={touched && !!errors.code} />
          {touched && errors.code ? (
            <Text variant="caption" tone="error">
              {errors.code}
            </Text>
          ) : null}
          <View className="flex-row items-center gap-2 pt-1">
            {seconds > 0 ? (
              <Text variant="body-sm" tone="secondary" tabular>{`Resend code in ${seconds}s`}</Text>
            ) : (
              <LinkText label="Resend code" onPress={resend} />
            )}
          </View>
          <Text variant="caption" tone="tertiary">
            You can also open the link in the email on this phone.
          </Text>
        </View>
      )}

      <TextField
        label="New password"
        required
        value={password}
        onChangeText={setPassword}
        error={touched ? errors.password : undefined}
        leadingIcon={IconLock}
        trailingIcon={show ? IconEyeOff : IconEye}
        onTrailingPress={() => setShow((s) => !s)}
        trailingAccessibilityLabel={show ? 'Hide password' : 'Show password'}
        placeholder="At least 8 characters"
        secureTextEntry={!show}
        autoCapitalize="none"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <TextField
        ref={confirmRef}
        label="Confirm new password"
        required
        value={confirm}
        onChangeText={setConfirm}
        error={touched ? errors.confirm : undefined}
        leadingIcon={IconLock}
        placeholder="Re-enter the password"
        secureTextEntry={!show}
        autoCapitalize="none"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button label="Reset password" loading={loading} onPress={submit} fullWidth haptic="light" />
    </FormScreen>
  );
}
