import { IconBrandWhatsapp, IconMail, IconShieldLock, IconTrash } from '@tabler/icons-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Dialog } from '@/components/ui/Dialog';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { emailTo } from '@/utils/contact';
import { Linking } from 'react-native';

const FAQ = [
  { q: 'How do I record what happened at a hearing?', a: 'Open Today or the case, tap "Record outcome", choose the result and set the next date.' },
  { q: 'Will I still get reminders without internet?', a: 'Yes. Reminders are scheduled on your phone, so they fire even offline.' },
  { q: 'Can I hide a court I no longer use?', a: 'Yes. More > Courts lets you hide, rename and reorder them. Old cases keep their court.' },
];

/** SCR-48 Help and about. */
export function HelpSection() {
  const toast = useToast();
  const deleteAccount = useAuth((s) => s.deleteAccount);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    setBusy(true);
    try {
      await deleteAccount();
    } catch (e) {
      setBusy(false);
      setConfirming(false);
      toast.show({ type: 'error', message: errorMessage(e) });
    }
  };
  const fail = () => toast.show({ type: 'error', message: 'Could not open the app on this device.' });
  return (
    <View className="gap-5">
      <ListGroup>
        <ListRow title="Email support" subtitle="support@vakil.app" leadingIcon={IconMail} trailing="chevron" onPress={() => emailTo('support@vakil.app').then((ok) => !ok && fail())} />
        <ListRow title="Chat on WhatsApp" subtitle="Replies within a working day" leadingIcon={IconBrandWhatsapp} leadingTone="success" trailing="chevron" onPress={() => Linking.openURL('https://wa.me/910000000000').catch(fail)} />
      </ListGroup>

      <View className="gap-3">
        <SectionHeader title="Common questions" first />
        {FAQ.map((f) => (
          <Card key={f.q} className="gap-1">
            <Text variant="title">{f.q}</Text>
            <Text variant="body" tone="secondary">
              {f.a}
            </Text>
          </Card>
        ))}
      </View>

      <View className="gap-3">
        <SectionHeader title="About" first />
        <Card className="gap-1">
          <KeyValueRow label="Version" value="1.0.0" divider />
          <KeyValueRow label="Data" value="Synced to your account" />
        </Card>
        <ListGroup>
          <ListRow title="Privacy" subtitle="Your cases are never shared." leadingIcon={IconShieldLock} />
        </ListGroup>
      </View>

      <View className="gap-3">
        <SectionHeader title="Account" first />
        <ListGroup>
          <ListRow title="Delete account" subtitle="Removes all your data permanently" leadingIcon={IconTrash} destructive onPress={() => setConfirming(true)} />
        </ListGroup>
      </View>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        variant="destructive"
        title="Delete your account?"
        message="All cases, clients and documents will be permanently removed. This cannot be undone."
        confirmLabel="Delete everything"
        cancelLabel="Keep account"
        confirmText="DELETE"
        loading={busy}
        onConfirm={remove}
      />
    </View>
  );
}
