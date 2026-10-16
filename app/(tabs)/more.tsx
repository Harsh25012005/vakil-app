import { IconArchive, IconBell, IconBriefcase, IconBuildingBank, IconHelpCircle, IconLock, IconLogout, IconUser, IconMoon } from '@tabler/icons-react-native';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useTabBarInset } from '@/components/ui/TabBar';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { errorMessage } from '@/services/api';

// SCR-42 More: profile card and the settings hub
const go = (section: string): Href => ({ pathname: '/settings/[section]', params: { section } });

export default function More() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const toast = useToast();
  const { mode } = useTheme();
  const advocate = useAuth((s) => s.advocate);
  const signOut = useAuth((s) => s.signOut);
  const [dialog, setDialog] = useState<'logout' | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setBusy(false);
      setDialog(null);
      toast.show({ type: 'error', message: errorMessage(e) });
    }
  };

  const themeLabel = mode === 'system' ? 'Device' : mode === 'dark' ? 'Dark' : 'Light';

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabInset + 16 }} contentContainerClassName="gap-5 px-5 pt-3">
        <Text variant="h1" accessibilityRole="header">
          More
        </Text>

        <Card onPress={() => router.push(go('profile'))} accessibilityLabel="Edit profile" className="flex-row items-center gap-4">
          <Avatar name={advocate?.fullName.trim() || undefined} uri={advocate?.avatarUri} size={56} />
          <View className="flex-1 gap-0.5">
            <Text variant="title" numberOfLines={1}>
              {advocate?.fullName || 'Your profile'}
            </Text>
            <Text variant="body-sm" tone="secondary" numberOfLines={1}>
              {advocate?.email ?? ''}
            </Text>
            {advocate?.enrolmentNo ? (
              <Text variant="caption" tone="tertiary">
                {advocate.enrolmentNo}
              </Text>
            ) : null}
          </View>
          <Text variant="body-sm" tone="primary">
            Edit
          </Text>
        </Card>

        <View className="gap-1">
          <SectionHeader title="Preferences" first />
          <ListGroup>
            <ListRow title="Appearance" leadingIcon={IconMoon} value={themeLabel} trailing="chevron" onPress={() => router.push(go('appearance'))} />
            <ListRow title="Notifications" subtitle="Reminder times" leadingIcon={IconBell} trailing="chevron" onPress={() => router.push(go('notifications'))} />
            <ListRow title="Security" subtitle="App lock" leadingIcon={IconLock} trailing="chevron" onPress={() => router.push(go('security'))} />
          </ListGroup>
        </View>

        <View className="gap-1">
          <SectionHeader title="Your lists" first />
          <ListGroup>
            <ListRow title="Courts" leadingIcon={IconBuildingBank} trailing="chevron" onPress={() => router.push(go('courts'))} />
            <ListRow title="Archive" subtitle="Cases you moved out of your list" leadingIcon={IconArchive} trailing="chevron" onPress={() => router.push('/archive')} />
            <ListRow title="Case types" leadingIcon={IconBriefcase} trailing="chevron" onPress={() => router.push(go('case-types'))} />
          </ListGroup>
        </View>

        <View className="gap-1">
          <SectionHeader title="Support" first />
          <ListGroup>
            <ListRow title="Help and about" leadingIcon={IconHelpCircle} trailing="chevron" onPress={() => router.push(go('help'))} />
          </ListGroup>
        </View>

        <View className="gap-1">
          <SectionHeader title="Account" first />
          <ListGroup>
            <ListRow title="Log out" leadingIcon={IconLogout} onPress={() => setDialog('logout')} />
          </ListGroup>
        </View>
      </ScrollView>

      <Dialog open={dialog === 'logout'} onClose={() => setDialog(null)} title="Log out?" message="You can sign back in with your mobile number any time. Your data stays safe." confirmLabel="Log out" cancelLabel="Stay" loading={busy} onConfirm={() => run(signOut)} />
    </View>
  );
}
