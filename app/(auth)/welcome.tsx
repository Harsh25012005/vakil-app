import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { OutcomeArt, QuickAddArt, ReminderArt } from '@/components/WelcomeArt';
import { LinkText } from '@/components/ui/LinkText';
import { Text } from '@/components/ui/Text';
import { getStored, setStored } from '@/utils/storage';
import { cn } from '@/utils/cn';

// SCR-02 Welcome carousel (3 slides)
const SLIDES: { art: () => React.JSX.Element; title: string; body: string }[] = [
  { art: ReminderArt, title: 'Never miss a hearing', body: 'Every case shows its next date, and a reminder reaches you the evening before and the morning of.' },
  { art: QuickAddArt, title: 'Add a case in seconds', body: 'One short form with smart defaults. Your courts and case types are remembered.' },
  { art: OutcomeArt, title: 'Updates from the court', body: 'Next dates, what happened at each hearing and new orders come in from eCourts by themselves.' },
];

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const list = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState(false);

  // Returning visitors (signed out again) skip straight to sign-in.
  useEffect(() => {
    getStored('welcome-seen', false).then((seen) => {
      if (seen) router.replace('/sign-in');
      else setChecked(true);
    });
  }, [router]);

  const finish = async () => {
    await setStored('welcome-seen', true);
    router.replace('/sign-in');
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  const last = index === SLIDES.length - 1;

  if (!checked) return <View className="flex-1 bg-bg" />;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }}>
      <View className="h-14 flex-row items-center justify-end px-5">{last ? null : <LinkText label="Skip" onPress={finish} />}</View>

      <FlatList
        ref={list}
        data={SLIDES}
        keyExtractor={(s) => s.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width }} className="items-center justify-center px-8">
            <item.art />
            <Text variant="h1" className="mt-10 text-center" accessibilityRole="header">
              {item.title}
            </Text>
            <Text variant="body-lg" tone="secondary" className="mt-3 text-center">
              {item.body}
            </Text>
          </View>
        )}
      />

      <View className="items-center gap-6 px-5 pt-4">
        <View className="flex-row gap-2" accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <View key={s.title} className={cn('h-2 rounded-full', i === index ? 'w-6 bg-primary' : 'w-2 bg-border-strong')} />
          ))}
        </View>
        <Button
          label={last ? 'Get started' : 'Next'}
          fullWidth
          onPress={() => (last ? finish() : list.current?.scrollToIndex({ index: index + 1, animated: true }))}
        />
      </View>
    </View>
  );
}
