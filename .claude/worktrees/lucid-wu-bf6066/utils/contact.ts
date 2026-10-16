import { Linking } from 'react-native';

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
