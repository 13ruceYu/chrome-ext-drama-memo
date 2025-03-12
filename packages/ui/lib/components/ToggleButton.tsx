import { exampleThemeStorage } from '@extension/storage';
import { useStorage } from '@extension/shared';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@iconify/react';

type ToggleButtonProps = ComponentPropsWithoutRef<'button'>;

export const ToggleButton = ({ className, children, ...props }: ToggleButtonProps) => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  return (
    <button onClick={exampleThemeStorage.toggle} {...props}>
      {children ? children : <Icon className={cn(className)} icon={isLight ? 'carbon:sun' : 'carbon:moon'} />}
    </button>
  );
};
