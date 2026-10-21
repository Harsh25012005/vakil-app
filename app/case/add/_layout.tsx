import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

/**
 * Add case, one page per step: court and search type -> search form -> results -> check and save.
 * The whole stack opens as one modal (root layout); these pages push inside it.
 */
export default function AddCaseLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
