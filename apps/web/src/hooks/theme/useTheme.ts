import { useContext } from 'react';

import { ThemeContext } from '@/components/theme/theme.context';

// The chosen theme, what is on screen, and a way to change it.
export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme needs a ThemeProvider');
  return theme;
}
