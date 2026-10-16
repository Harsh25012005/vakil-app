import { Linking, Platform } from 'react-native';

/** FR-CASE-12 / FR-CLI-05: call, WhatsApp and SMS go through device intents. Returns false if nothing could open. */
const open = async (url: string) => {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
};

export const callPhone = (phone: string) => open(`tel:+91${phone}`);
export const whatsAppPhone = (phone: string) => open(`https://wa.me/91${phone}`);
export const smsPhone = (phone: string) => open(`sms:+91${phone}`);
export const emailTo = (email: string) => open(`mailto:${email}`);

/**
 * Opens the Gmail app's inbox, or Gmail on the web when the app isn't installed.
 * iOS has a gmail URL scheme; on Android the mail.google.com link is handed to the Gmail app.
 */
export async function openGmail() {
  if (Platform.OS === 'ios' && (await open('googlegmail://'))) return true;
  return open('https://mail.google.com/mail/u/0/#inbox');
}
