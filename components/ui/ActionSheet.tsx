import type { IconComponent } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SheetOption } from '@/components/ui/SheetOption';

export type SheetAction = {
  key: string;
  label: string;
  icon?: IconComponent;
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
};

/** CMP-54. Overflow menus (case actions SCR-27, document menu). Destructive actions go last. */
export function ActionSheet({ open, onClose, title, actions }: Props) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      showClose={false}
      footer={<Button label="Cancel" variant="outline" onPress={onClose} fullWidth />}
    >
      {actions.map((a) => (
        <SheetOption
          key={a.key}
          label={a.label}
          icon={a.icon}
          destructive={a.destructive}
          control="none"
          onPress={() => {
            onClose();
            a.onPress();
          }}
        />
      ))}
    </BottomSheet>
  );
}
