import { IconEye, IconEyeOff, IconLock, IconMail, IconUser } from '@tabler/icons-react-native';
import { emailSchema, fullNameSchema } from '@vakil/shared';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import { FormScreen } from '@/components/FormScreen';
import { GoogleButton } from '@/components/GoogleButton';
import { Button } from '@/components/ui/Button';
import { LinkText } from '@/components/ui/LinkText';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage, isApiError } from '@/services/api';
import { signUp } from '@/services/auth';

// SCR-04 Sign up (name, email, password)
export default function SignUp() {
  const router = useRouter();
  const toast = useToast();
  const setSession = useAuth((s) => s.setSession);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const errors = {
    name: fullNameSchema.safeParse(name).success ? undefined : 'Enter a name of at least 2 letters',
    email: emailSchema.safeParse(email.trim()).success ? undefined : 'Enter a valid email',
    password: password.length >= 8 ? undefined : 'Password must be at least 8 characters',
    confirm: confirm === password ? undefined : 'Passwords do not match',
  };
  const show_ = (k: keyof typeof errors) => (touched ? errors[k] : undefined);

  const submit = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setLoading(true);
    try {
      const res = await signUp({ fullName: name, email, password });
      if (res.status === 'signedIn') return setSession(res.session);
      // Email confirmation is on in Supabase: no session until the link in the email is opened.
      setLoading(false);
      router.replace({ pathname: '/confirm-email', params: { email: res.email } });
    } catch (e) {
      setLoading(false);
      if (isApiError(e) && e.code === 'EMAIL_TAKEN') toast.show({ type: 'info', message: e.message, actionLabel: 'Sign in', onAction: () => router.replace('/sign-in') });
      else toast.show({ type: 'error', message: errorMessage(e) });
    }
  };

  return (
    <FormScreen avoidKeyboard={false} title="Create your account" subtitle="Takes under a minute. Your cases are backed up securely to your account.">
      <TextField label="Full name" required value={name} onChangeText={setName} error={show_('name')} leadingIcon={IconUser} placeholder="Adv. Rohan Mehta" autoCapitalize="words" autoComplete="name" textContentType="name" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
      <TextField
        ref={emailRef}
        label="Email"
        required
        value={email}
        onChangeText={setEmail}
        error={show_('email')}
        leadingIcon={IconMail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Password"
        required
        value={password}
        onChangeText={setPassword}
        error={show_('password')}
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
        label="Confirm password"
        required
        value={confirm}
        onChangeText={setConfirm}
        error={show_('confirm')}
        leadingIcon={IconLock}
        placeholder="Re-enter your password"
        secureTextEntry={!show}
        autoCapitalize="none"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Button label="Create account" loading={loading} onPress={submit} fullWidth haptic="light" />
      <Text variant="caption" tone="tertiary" className="text-center">
        By continuing you agree to the terms of service and privacy policy.
      </Text>
      <GoogleButton />

      <View className="flex-row items-center justify-center gap-1 pt-2">
        <Text variant="body" tone="secondary">
          Already have an account?
        </Text>
        <LinkText label="Sign in" onPress={() => router.replace('/sign-in')} />
      </View>
    </FormScreen>
  );
}
