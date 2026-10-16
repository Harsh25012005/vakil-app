# Components

Import from `@/components`. Open the `/design-system` route to see every component in dark and light.

```
components/
├── ui/                 Generic building blocks (no case or client knowledge)
├── CaseCard.tsx        Domain cards, built from ui/
├── HearingCard.tsx
├── ClientCard.tsx
├── DocumentTile.tsx
├── NoteCard.tsx
└── docs/               Helpers used only by the style-guide screen
```

`ui/` contains: Text, Icon, PressableScale, GradientSurface, Button, IconButton, LinkText, SwipeableRow, TextField, TextArea, SearchBar, Select, MultiSelect, DatePicker, TimePicker, PhoneInput, OtpInput, AmountInput, Toggle, Checkbox, Radio, Chip, Card, Pill, StatusPill, Badge, Avatar, ListRow, Timeline, CalendarMonth, WeekStrip, Progress, TabBar, TopAppBar, Tabs, Toast, Banner, EmptyState, Skeleton, BottomSheet, Dropdown, Dialog, ActionSheet and a few more.

## Shape

| Radius | Used by |
|---|---|
| pill (`rounded-full`) | Buttons, every single-line input, search bar, dropdown triggers, OTP circles, chips, pills, badges, avatars, toggles, segmented control |
| 16 (`rounded-lg`) | `TextArea`, dropdown panels, banners and toasts |
| 20 (`rounded-xl`) | Every card |
| 28 (`rounded-2xl`) | Bottom sheets, dialogs |
| 7 px | Checkbox |

## Rules

- **Color:** semantic classes only. Values live in `constants/theme.ts`; run `npm run theme:css` to regenerate `global.css`. Dark is true black.
- **One gradient:** the `primary` Button. Nothing else uses a gradient.
- **Press:** every tappable surface is a `PressableScale`.
- **Selects are dropdowns** anchored under the field. Sheets are for the date and time pickers and action sheets.
- **Toast** slides in from the top and looks like `Banner`.
- **Accessibility:** icon buttons require `accessibilityLabel`; status pills read "Status: X".
