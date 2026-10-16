import type { ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/cn';

/** A top-level group (Colors, Buttons, Inputs...). Starts with a divider line. */
export function DocSection({
  eyebrow,
  title,
  description,
  onLayout,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  onLayout?: (e: LayoutChangeEvent) => void;
  children: ReactNode;
}) {
  return (
    <View onLayout={onLayout} className="mt-12">
      <View className="mb-6 h-px bg-border" />
      <Text variant="overline" tone="primary">
        {eyebrow}
      </Text>
      <Text variant="h1" className="mt-1" accessibilityRole="header">
        {title}
      </Text>
      {description ? (
        <Text variant="body" tone="secondary" className="mt-2">
          {description}
        </Text>
      ) : null}
      <View className="mt-6 gap-10">{children}</View>
    </View>
  );
}

/** One component: title + CMP id + what it's for, then a canvas with every variation. */
export function ComponentDoc({ name, cmp, description, children }: { name: string; cmp?: string; description?: string; children?: ReactNode }) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        <Text variant="h3" accessibilityRole="header">
          {name}
        </Text>
        {cmp ? <Pill label={cmp} size="sm" tone="neutral" /> : null}
      </View>
      {description ? (
        <Text variant="body-sm" tone="secondary">
          {description}
        </Text>
      ) : null}
      {children ? <View className="gap-6 rounded-xl border border-border bg-surface p-4">{children}</View> : null}
    </View>
  );
}

/** A labelled variation inside a ComponentDoc canvas. */
export function Variation({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <View className={cn('gap-3', className)}>
      <Text variant="overline" tone="tertiary">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** Color chip with name and hex. */
export function Swatch({ name, hex, size = 'md' }: { name: string; hex: string; size?: 'sm' | 'md' }) {
  return (
    <View className="flex-1 gap-1.5" accessible accessibilityLabel={`${name} ${hex}`}>
      <View className={cn('rounded-lg border border-border', size === 'sm' ? 'h-10' : 'h-14')} style={{ backgroundColor: hex }} />
      <View>
        <Text variant="caption" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" tone="tertiary" tabular numberOfLines={1} style={{ fontSize: 11 }}>
          {hex.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

/** Lays swatches out in rows of `columns`, padding the last row so widths stay equal. */
export function SwatchGrid({ items, columns = 4, size }: { items: { name: string; hex: string }[]; columns?: number; size?: 'sm' | 'md' }) {
  const rows: { name: string; hex: string }[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View className="gap-4">
      {rows.map((row, ri) => (
        <View key={ri} className="flex-row gap-3">
          {row.map((s) => (
            <Swatch key={s.name} name={s.name} hex={s.hex} size={size} />
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`pad-${i}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}
