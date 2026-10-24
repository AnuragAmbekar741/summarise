import { createCn } from 'cn/config';

// Teach the class merger our design tokens, so `text-button` is read as a
// font size and does not cancel a text colour like `text-on-primary`.
export const cn = createCn({
  extend: {
    theme: {
      text: [
        'display-mega',
        'display-xl',
        'display-lg',
        'display-md',
        'display-sm',
        'title-md',
        'title-sm',
        'body-md',
        'body-strong',
        'body-sm',
        'caption',
        'caption-upper',
        'button',
        'nav-link',
      ],
      shadow: ['soft'],
    },
  },
});
