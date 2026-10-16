import { IconCamera } from '@tabler/icons-react-native';
import { fullNameSchema } from '@vakil/shared';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { TextField } from '@/components/ui/TextField';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/services/api';

export const PRACTICE_AREAS = ['Civil', 'Criminal', 'Family', 'NI Act 138', 'MACT', 'Writ', 'Consumer', 'Labour', 'Property', 'Tax', 'Arbitration'].map((a) => ({ value: a, label: a }));

/** SCR-43 Edit profile. The phone number is the sign-in identity, so it is shown but not editable. */
export function ProfileSection({ onSaved }: { onSaved: () => void }) {
  const toast = useToast();
  const advocate = useAuth((s) => s.advocate);
  const patch = useAuth((s) => s.patch);

  const [name, setName] = useState(advocate?.fullName ?? '');
  const [areas, setAreas] = useState<string[]>(advocate?.practiceAreas ?? []);
  const [avatar, setAvatar] = useState<string | undefined>(advocate?.avatarUri);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const nameOk = fullNameSchema.safeParse(name).success;
  const dirty =
    name.trim() !== (advocate?.fullName ?? '') ||
    avatar !== advocate?.avatarUri ||
    JSON.stringify(areas) !== JSON.stringify(advocate?.practiceAreas ?? []);

  const pickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (!res.canceled) setAvatar(res.assets[0]?.uri);
    } catch {
      toast.show({ type: 'error', message: "Couldn't open your photos. Check the permission in Settings." });
    }
  };

  const save = async () => {
    setTouched(true);
    if (!nameOk) return;
    setSaving(true);
    try {
      await patch({ fullName: name.trim(), practiceAreas: areas, avatarUri: avatar });
      toast.show({ type: 'success', message: 'Profile saved' });
      onSaved();
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e), actionLabel: 'Retry', onAction: save });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-5">
      <View className="items-center gap-3 pb-1">
        <View>
          <Avatar name={name.trim() || undefined} uri={avatar} size={80} />
          <View className="absolute -bottom-1 -right-1">
            <IconButton icon={IconCamera} accessibilityLabel="Change photo" variant="filled" size="sm" onPress={pickPhoto} />
          </View>
        </View>
      </View>
      <TextField label="Full name" required value={name} onChangeText={setName} error={touched && !nameOk ? 'Enter a name of at least 2 letters' : undefined} autoCapitalize="words" />
      <TextField label="Email" value={advocate?.email ?? ''} disabled helper="Your sign-in email can't be changed." />
      <MultiSelect label="Practice areas" options={PRACTICE_AREAS} values={areas} onChange={setAreas} placeholder="Select your areas" />
      <Button label="Save changes" onPress={save} loading={saving} disabled={!dirty} fullWidth haptic="light" />
    </View>
  );
}
