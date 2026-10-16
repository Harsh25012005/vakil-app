import { IconCamera } from '@tabler/icons-react-native';
import { fullNameSchema } from '@vakil/shared';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { FormScreen } from '@/components/FormScreen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { LinkText } from '@/components/ui/LinkText';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/services/api';

// SCR-06 Profile setup
const AREAS = ['Civil', 'Criminal', 'Family', 'NI Act 138', 'MACT', 'Writ', 'Consumer', 'Labour', 'Property', 'Tax', 'Arbitration'].map((a) => ({ value: a, label: a }));

export default function ProfileSetup() {
  const router = useRouter();
  const toast = useToast();
  const advocate = useAuth((s) => s.advocate);
  const patch = useAuth((s) => s.patch);

  const [name, setName] = useState(advocate?.fullName ?? '');
  const [areas, setAreas] = useState<string[]>(advocate?.practiceAreas ?? []);
  const [avatar, setAvatar] = useState<string | undefined>(advocate?.avatarUri);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const nameOk = fullNameSchema.safeParse(name).success;
  const nameError = touched && !nameOk ? 'Enter a name of at least 2 letters' : undefined;

  const pickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (!res.canceled) setAvatar(res.assets[0]?.uri);
    } catch {
      toast.show({ type: 'error', message: "Couldn't open your photos. Check the permission in Settings." });
    }
  };

  const next = async () => {
    setTouched(true);
    if (!nameOk) return;
    setSaving(true);
    try {
      await patch({ fullName: name.trim(), practiceAreas: areas, avatarUri: avatar });
      router.push('/notifications-permission');
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen avoidKeyboard={false}
      eyebrow="Step 1 of 2"
      title="Tell us about you"
      subtitle="This personalises your app. You can change it any time."
      footer={<Button label="Continue" loading={saving} disabled={!nameOk} onPress={next} fullWidth haptic="light" />}
    >
      <View className="items-center gap-3 pb-1">
        <View>
          <Avatar name={name.trim() || undefined} uri={avatar} size={80} ring />
          <View className="absolute -bottom-1 -right-1">
            <IconButton icon={IconCamera} accessibilityLabel="Choose profile photo" variant="filled" size="sm" onPress={pickPhoto} />
          </View>
        </View>
        {avatar ? <LinkText label="Remove photo" onPress={() => setAvatar(undefined)} /> : null}
      </View>

      <TextField
        label="Full name"
        required
        value={name}
        onChangeText={setName}
        onBlur={() => name && setTouched(true)}
        error={nameError}
        placeholder="Adv. Rohan Mehta"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="done"
      />
      <MultiSelect label="Practice areas" values={areas} onChange={setAreas} options={AREAS} placeholder="Select your areas" helper="Used to pre-fill case types." />
    </FormScreen>
  );
}
