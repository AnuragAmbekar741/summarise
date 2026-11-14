// What the brand guidelines page lists. Values are read live from the CSS
// variables in index.css, so the page always shows what the app uses.

export type ColorToken = {
  name: string;
  // The CSS variable that holds it.
  cssVar: string;
  usage: string;
};

export const COLOR_GROUPS: { title: string; tokens: ColorToken[] }[] = [
  {
    title: 'Action',
    tokens: [
      {
        name: 'primary',
        cssVar: '--primary-ink',
        usage: 'The one ink pill per view, and the floating pills.',
      },
      {
        name: 'primary-active',
        cssVar: '--primary-active',
        usage: 'Hover and press on primary.',
      },
      {
        name: 'on-primary',
        cssVar: '--on-primary',
        usage: 'Text and icons on primary.',
      },
    ],
  },
  {
    title: 'Text',
    tokens: [
      {
        name: 'ink',
        cssVar: '--ink',
        usage: 'Titles, display type, primary text.',
      },
      {
        name: 'body-strong',
        cssVar: '--body-strong',
        usage: 'Transcript lines, emphasis.',
      },
      { name: 'body', cssVar: '--body', usage: 'Default running text.' },
      {
        name: 'muted',
        cssVar: '--muted-text',
        usage: 'Helper text, timestamps, meta, day headings.',
      },
      {
        name: 'muted-soft',
        cssVar: '--muted-soft',
        usage: 'Placeholders and disabled text only.',
      },
    ],
  },
  {
    title: 'Surfaces',
    tokens: [
      { name: 'canvas', cssVar: '--canvas', usage: 'The page floor.' },
      {
        name: 'canvas-soft',
        cssVar: '--canvas-soft',
        usage: 'Quiet fills inside cards.',
      },
      {
        name: 'surface-card',
        cssVar: '--surface-card',
        usage: 'Cards, dialogs, menus, toasts, inputs.',
      },
      {
        name: 'surface-strong',
        cssVar: '--surface-strong',
        usage: 'Chips, tab track, icon plates, hovers.',
      },
    ],
  },
  {
    title: 'Lines',
    tokens: [
      {
        name: 'hairline',
        cssVar: '--hairline',
        usage: 'Default divider and card outline.',
      },
      {
        name: 'hairline-soft',
        cssVar: '--hairline-soft',
        usage: 'The faintest divider.',
      },
      {
        name: 'hairline-strong',
        cssVar: '--hairline-strong',
        usage: 'Input and outline-button borders.',
      },
    ],
  },
  {
    title: 'Signal',
    tokens: [
      {
        name: 'error',
        cssVar: '--error',
        usage: 'Live recording dot, destructive actions, field errors.',
      },
      {
        name: 'success',
        cssVar: '--success',
        usage: 'The “Transcript ready” dot, success toasts.',
      },
    ],
  },
  {
    title: 'Atmosphere',
    tokens: [
      {
        name: 'orb-mint',
        cssVar: '--color-orb-mint',
        usage: 'Orbs only.',
      },
      {
        name: 'orb-peach',
        cssVar: '--color-orb-peach',
        usage: 'Orbs only.',
      },
      {
        name: 'orb-lavender',
        cssVar: '--color-orb-lavender',
        usage: 'Orbs only.',
      },
      {
        name: 'orb-sky',
        cssVar: '--color-orb-sky',
        usage: 'The Sky Wash on every page.',
      },
      {
        name: 'orb-rose',
        cssVar: '--color-orb-rose',
        usage: 'Orbs only.',
      },
    ],
  },
];

export type TypeToken = {
  // The Tailwind class, e.g. "text-display-lg".
  className: string;
  name: string;
  specs: string;
  sample: string;
  display?: boolean;
  upper?: boolean;
  mono?: boolean;
};

export const TYPE_SCALE: TypeToken[] = [
  {
    className: 'text-display-mega',
    name: 'display-mega',
    specs: 'Newsreader 64 / 300 · 1.05 · −1.92',
    sample: 'Every lecture, written down.',
    display: true,
  },
  {
    className: 'text-display-xl',
    name: 'display-xl',
    specs: 'Newsreader 48 / 300 · 1.08 · −0.96',
    sample: 'Every lecture, written down.',
    display: true,
  },
  {
    className: 'text-display-lg',
    name: 'display-lg',
    specs: 'Newsreader 36 / 300 · 1.17 · −0.36',
    sample: 'Lecture 4: Graphs',
    display: true,
  },
  {
    className: 'text-display-md',
    name: 'display-md',
    specs: 'Newsreader 32 / 300 · 1.13 · −0.32',
    sample: 'Welcome back',
    display: true,
  },
  {
    className: 'text-display-sm',
    name: 'display-sm',
    specs: 'Newsreader 24 / 300 · 1.2',
    sample: 'cs207-lecture3-60min',
    display: true,
  },
  {
    className: 'text-title-md',
    name: 'title-md',
    specs: 'Inter 20 / 500 · 1.35',
    sample: 'Component title',
  },
  {
    className: 'text-title-sm',
    name: 'title-sm',
    specs: 'Inter 18 / 500 · 1.44 · +0.18',
    sample: 'List label',
  },
  {
    className: 'text-body-md',
    name: 'body-md',
    specs: 'Inter 16 / 400 · 1.5 · +0.16',
    sample:
      'So last time we went through a bunch of different electronic signals.',
  },
  {
    className: 'text-body-strong',
    name: 'body-strong',
    specs: 'Inter 16 / 500 · 1.5 · +0.16',
    sample: 'Email',
  },
  {
    className: 'text-body-sm',
    name: 'body-sm',
    specs: 'Inter 15 / 400 · 1.47 · +0.15',
    sample: 'This can’t be undone.',
  },
  {
    className: 'text-caption',
    name: 'caption',
    specs: 'Inter 14 / 400 · 1.5',
    sample: '10:00am · 42 min',
  },
  {
    className: 'text-caption-upper',
    name: 'caption-upper',
    specs: 'Inter 12 / 600 · 1.4 · +0.96 · uppercase',
    sample: 'Transcript ready',
    upper: true,
  },
  {
    className: 'text-button',
    name: 'button',
    specs: 'Inter 15 / 500 · 1',
    sample: 'Start notetaker',
  },
  {
    className: 'text-nav-link',
    name: 'nav-link',
    specs: 'Inter 15 / 500 · 1.4',
    sample: 'All notes',
  },
  {
    className: 'text-body-md font-medium',
    name: 'clock',
    specs: 'Mono 16 / 500 · tabular',
    sample: '00:42:39',
    mono: true,
  },
  {
    className: 'text-caption',
    name: 'timestamp',
    specs: 'Mono 14 / 400 · tabular',
    sample: '01:26',
    mono: true,
  },
];

export const SPACING = [
  { name: 'xxs', px: 4, usage: 'Between loading dots' },
  { name: 'xs', px: 8, usage: 'Icon to label, between note rows' },
  { name: 'sm', px: 12, usage: 'Dots to label, row side padding' },
  { name: 'base', px: 16, usage: 'Mobile gutter, time to text' },
  { name: 'md', px: 20, usage: 'Button sides, pill left padding' },
  { name: 'lg', px: 24, usage: 'Between transcript lines, dialog sections' },
  { name: 'xl', px: 32, usage: 'Card padding, between list days' },
  { name: 'xxl', px: 48, usage: 'Desktop gutter, title to tabs' },
  { name: 'section', px: 96, usage: 'Section rhythm, page bottom' },
];

export const RADII = [
  { name: 'xs', className: 'rounded-xs', value: '4px', usage: 'Checkbox' },
  { name: 'sm', className: 'rounded-sm', value: '6px', usage: 'Compact rows' },
  { name: 'md', className: 'rounded-md', value: '8px', usage: 'Inputs' },
  {
    name: 'lg',
    className: 'rounded-lg',
    value: '12px',
    usage: 'Menus, hovered row',
  },
  {
    name: 'xl',
    className: 'rounded-xl',
    value: '16px',
    usage: 'Cards, toasts',
  },
  {
    name: '2xl',
    className: 'rounded-2xl',
    value: '24px',
    usage: 'Dialogs, live card, drop zone',
  },
  {
    name: 'pill',
    className: 'rounded-full',
    value: '9999px',
    usage: 'Buttons, chips, tabs, pills',
  },
];
