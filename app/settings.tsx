import { Redirect } from 'expo-router';

// The settings hub lives in the More tab (SCR-42); this route only keeps old links working.
export default function Settings() {
  return <Redirect href="/more" />;
}
