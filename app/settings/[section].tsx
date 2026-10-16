import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { FormScreen } from '@/components/FormScreen';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { HelpSection } from '@/components/settings/HelpSection';
import { ListManager } from '@/components/settings/ListManager';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { SecuritySection } from '@/components/settings/SecuritySection';

// SCR-43..48 One screen per settings section, reached from the More tab
export default function SettingsSection() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const router = useRouter();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/more'));

  const body = {
    profile: { title: 'Edit profile', node: <ProfileSection onSaved={back} /> },
    appearance: { title: 'Appearance', node: <AppearanceSection /> },
    notifications: { title: 'Notifications', node: <NotificationsSection /> },
    courts: { title: 'Courts', node: <ListManager kind="courts" /> },
    'case-types': { title: 'Case types', node: <ListManager kind="caseTypes" /> },
    security: { title: 'Security', node: <SecuritySection /> },
    help: { title: 'Help and about', node: <HelpSection /> },
  }[section ?? ''];

  if (!body) return <Redirect href="/more" />;
  return (
    <FormScreen onBack={back} title={body.title}>
      {body.node}
    </FormScreen>
  );
}
