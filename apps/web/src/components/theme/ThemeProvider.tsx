import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { ThemeContext, type ResolvedTheme, type Theme } from './theme.context';

// Spec: docs/design/components/theme-provider.md
// index.html reads the same key before React loads, so there's no flash.
const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

// Follows the system until the user presses D, which flips light and dark
// and remembers the choice. Every open tab follows along.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  const setTheme = useCallback((next: Theme) => {
    storeTheme(next);
    setThemeState(next);
  }, []);

  useEffect(() => applyTheme(resolvedTheme), [resolvedTheme]);

  // Only shows while the theme is 'system', but kept current regardless.
  useEffect(() => {
    const query = matchMedia(DARK_QUERY);
    const onChange = () => setSystemTheme(getSystemTheme());
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Held keys, shortcuts like Ctrl+D, and typing in a field are left alone.
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.key.toLowerCase() !== 'd' || isEditable(event.target)) return;
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [resolvedTheme, setTheme]);

  // Another tab changed the theme.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      setThemeState(isTheme(event.newValue) ? event.newValue : 'system');
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function isTheme(value: string | null): value is Theme {
  return value === 'dark' || value === 'light' || value === 'system';
}

// Storage can be blocked (e.g. some private windows); then the choice just
// isn't remembered.
function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function storeTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Not remembered; the theme still changes for this visit.
  }
}

function getSystemTheme(): ResolvedTheme {
  return matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest('input, textarea, select') !== null)
  );
}

// Switches instantly: transitions are off for the frame the colours change,
// so buttons and borders don't fade between themes.
function applyTheme(resolved: ResolvedTheme) {
  const style = document.createElement('style');
  style.textContent = '*,*::before,*::after{transition:none!important}';
  document.head.appendChild(style);

  document.documentElement.classList.toggle('dark', resolved === 'dark');

  // Forces the new colours to apply before transitions come back.
  window.getComputedStyle(document.body);
  requestAnimationFrame(() => requestAnimationFrame(() => style.remove()));
}
