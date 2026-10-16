// Vakil.app design system. Import from '@/components'.
// ui/ holds the generic building blocks; the cards next to it are built from them.

// Foundation
export { Text, type TextVariant } from './ui/Text';
export { Icon, type IconComponent } from './ui/Icon';
export { PressableScale } from './ui/PressableScale';
export { GradientSurface } from './ui/GradientSurface';

// Actions
export { Button, BUTTON_SIZES, BUTTON_VARIANTS, type ButtonSize, type ButtonVariant } from './ui/Button';
export { IconButton, type IconButtonVariant } from './ui/IconButton';
export { LinkText } from './ui/LinkText';
export { SwipeableRow, type SwipeAction } from './ui/SwipeableRow';

// Inputs
export { FieldShell, InputBox } from './ui/Field';
export { TextField } from './ui/TextField';
export { TextArea } from './ui/TextArea';
export { SearchBar } from './ui/SearchBar';
export { Select, type SelectOption } from './ui/Select';
export { MultiSelect } from './ui/MultiSelect';
export { DatePicker } from './ui/DatePicker';
export { TimePicker } from './ui/TimePicker';
export { PhoneInput } from './ui/PhoneInput';
export { OtpInput } from './ui/OtpInput';
export { AmountInput } from './ui/AmountInput';

// Selection
export { Toggle } from './ui/Toggle';
export { Checkbox } from './ui/Checkbox';
export { Radio, RadioGroup } from './ui/Radio';
export { FilterChip, ChoiceChip, InputChip } from './ui/Chip';

// Display
export { Card } from './ui/Card';
export { Pill } from './ui/Pill';
export { IconBadge } from './ui/IconBadge';
export { StatusPill, OutcomePill, caseStatusMap, outcomeMap, type CaseStatusKind } from './ui/StatusPill';
export { Badge } from './ui/Badge';
export { Avatar } from './ui/Avatar';
export { ListRow, ListGroup } from './ui/ListRow';
export { SectionHeader } from './ui/SectionHeader';
export { KeyValueRow } from './ui/KeyValueRow';
export { Timeline, type TimelineItem } from './ui/Timeline';
export { CalendarMonth } from './ui/CalendarMonth';
export { WeekStrip } from './ui/WeekStrip';
export { LinearProgress, RingProgress } from './ui/Progress';
export { InfoTag } from './ui/InfoTag';

// Navigation
export { TabBar, useTabBarInset, type TabIcons } from './ui/TabBar';
export { TopAppBar } from './ui/TopAppBar';
export { Tabs } from './ui/Tabs';

// Feedback
export { ToastProvider, useToast } from './ui/Toast';
export { Banner } from './ui/Banner';
export { EmptyState } from './ui/EmptyState';
export { Skeleton, SkeletonText, SkeletonAvatar, SkeletonRow, SkeletonCard } from './ui/Skeleton';

// Overlays
export { BottomSheet } from './ui/BottomSheet';
export { SheetOption } from './ui/SheetOption';
export { Dropdown, MenuItem, MenuEmpty } from './ui/Dropdown';
export { Dialog } from './ui/Dialog';
export { ActionSheet, type SheetAction } from './ui/ActionSheet';

// Domain cards (built from the above)
export { CaseCard } from './CaseCard';
export { HearingCard } from './HearingCard';
export { ClientCard } from './ClientCard';
export { DocumentTile } from './DocumentTile';
export { NoteCard } from './NoteCard';
