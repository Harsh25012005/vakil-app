import { IconEye, IconEyeOff, IconLock, IconMail } from '@tabler/icons-react-native';
import { emailSchema } from '@vakil/shared';
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
import { errorMessage } from '@/services/api';
import { signIn } from '@/services/auth';

// SCR-03 Sign in (email + password)
export default function SignIn() {
  const router = useRouter();
  const toast = useToast();
  const setSession = useAuth((s) => s.setSession);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailError = touched && !emailSchema.safeParse(email.trim()).success ? 'Enter a valid email' : undefined;
  const passwordError = touched && password.length < 8 ? 'Password must be at least 8 characters' : undefined;

  const submit = async () => {
    setTouched(true);
    if (!emailSchema.safeParse(email.trim()).success || password.length < 8) return;
    setLoading(true);
    try {
      setSession(await signIn(email, password));
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
      setLoading(false);
    }
  };

  return (
    <FormScreen avoidKeyboard={false} title="Welcome back" subtitle="Sign in to see your cases and hearings.">
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        leadingIcon={IconMail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <View className="gap-3">
        <TextField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          leadingIcon={IconLock}
          trailingIcon={show ? IconEyeOff : IconEye}
          onTrailingPress={() => setShow((s) => !s)}
          trailingAccessibilityLabel={show ? 'Hide password' : 'Show password'}
          placeholder="Your password"
          secureTextEntry={!show}
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <LinkText label="Forgot password?" onPress={() => router.push({ pathname: '/forgot-password', params: { email: email.trim() } })} className="self-end" />
      </View>

      <Button label="Sign in" loading={loading} onPress={submit} fullWidth haptic="light" />
      <GoogleButton />

      <View className="flex-row items-center justify-center gap-1 pt-2">
        <Text variant="body" tone="secondary">
          New to Vakil?
        </Text>
        <LinkText label="Create an account" onPress={() => router.replace('/sign-up')} />
      </View>
    </FormScreen>
  );
}
