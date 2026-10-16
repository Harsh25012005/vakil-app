import { IconBriefcase, IconCalendar, IconDots, IconHome, IconUsers } from '@tabler/icons-react-native';
import { Tabs } from 'expo-router';
import { TabBar, type TabIcons } from '@/components/ui/TabBar';

const TAB_ICONS: TabIcons = {
  index: { icon: IconHome },
  cases: { icon: IconBriefcase },
  calendar: { icon: IconCalendar },
  clients: { icon: IconUsers },
  more: { icon: IconDots },
};

// CMP-45: 5 tabs - Home, Cases, Calendar, Clients, More
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} icons={TAB_ICONS} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="cases" options={{ title: 'Cases' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
