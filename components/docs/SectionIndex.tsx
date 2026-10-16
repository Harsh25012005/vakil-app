import { forwardRef, memo, useImperativeHandle, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ChoiceChip } from '@/components';

export type SectionIndexHandle = { setActive: (name: string) => void };

type Props = { sections: readonly string[]; onSelect: (name: string) => void };

/**
 * Sticky chip row for jumping between gallery sections. Owns its own "active" state and exposes
 * setActive() imperatively, so scrolling never re-renders the (very large) gallery page.
 */
export const SectionIndex = memo(
  forwardRef<SectionIndexHandle, Props>(function SectionIndex({ sections, onSelect }, ref) {
    const [active, setActive] = useState(sections[0]);
    const row = useRef<ScrollView>(null);
    const x = useRef<Record<string, number>>({});

    useImperativeHandle(ref, () => ({
      setActive: (name) => {
        setActive(name);
        const left = x.current[name];
        if (left !== undefined) row.current?.scrollTo({ x: Math.max(0, left - 20), animated: true });
      },
    }));

    return (
      <ScrollView ref={row} horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5" keyboardShouldPersistTaps="handled">
        {sections.map((s) => (
          <View key={s} onLayout={(e) => (x.current[s] = e.nativeEvent.layout.x)}>
            <ChoiceChip label={s} selected={active === s} onPress={() => onSelect(s)} />
          </View>
        ))}
      </ScrollView>
    );
  }),
);
