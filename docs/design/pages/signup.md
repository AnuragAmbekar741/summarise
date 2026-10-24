# Signup

Where a new user creates an account, with Google or with name, email and
password. They must agree to the terms first.

**Route:** `/signup`
**Source:** `apps/web/src/pages/SignupPage.tsx`

## Layout

Uses [`AuthLayout`](../components/auth-layout.md). Card content, top to
bottom:

1. Heading and subheading
2. Terms box: checkbox + agreement text
3. Google button
4. OR divider
5. Name, Email and Password fields
6. Create account button
7. Footer row: "Already have an account?" + link to login, above a hairline

## Components

| Component                                                             | Variant                     | Where                               |
| --------------------------------------------------------------------- | --------------------------- | ----------------------------------- |
| [`Button`](../components/button.md)                                   | `outline`                   | Nav: "Log in"                       |
| [`Checkbox`](../components/checkbox.md)                               | —                           | Terms box                           |
| [`GoogleButton`](../components/google-button.md)                      | —                           | Below the terms box                 |
| [`OrDivider`](../components/or-divider.md)                            | —                           | Between Google and email            |
| [`Label`](../components/label.md) + [`Input`](../components/input.md) | —                           | Name, Email, Password               |
| [`Button`](../components/button.md)                                   | `outline`, `lg`, full width | Submit: "Create account with email" |
| [`Button`](../components/button.md)                                   | `secondary`                 | Footer: "Log in →"                  |

## Typography & spacing

| Piece         | Token                                                    | Spacing                                       |
| ------------- | -------------------------------------------------------- | --------------------------------------------- |
| Heading       | `{typography.display-lg}`                                | —                                             |
| Subheading    | `{typography.body-md}`, body                             | 12px below heading                            |
| Terms box     | `{typography.body-sm}`, body; links ink, 500, underlined | 32px below subheading; 16px padding, 12px gap |
| Google button | —                                                        | 24px below terms box                          |
| OR divider    | —                                                        | 24px above and below                          |
| Field label   | `{typography.body-strong}`                               | 12px above its input                          |
| Fields        | —                                                        | 20px between fields                           |
| Submit        | —                                                        | 24px below last field                         |
| Footer row    | `{typography.body-md}`, body                             | 32px above, 24px inside the hairline          |

Terms box: `{colors.canvas-soft}` background, 1px `{colors.hairline}` border,
`{rounded.lg}` (12px).

## Atmosphere

| Orb        | Position (centre)  | Size  |
| ---------- | ------------------ | ----- |
| `lavender` | 20% left, 20% top  | 720px |
| `sky`      | 92% left, 30% top  | 640px |
| `mint`     | 54% left, 88% top  | 640px |
| `rose`     | 76% left, 100% top | 480px |

## Copy

- Nav: "Log in"
- Headline: "Never miss / a word again."
- Description: "Record any lecture and get a searchable transcript plus AI
  notes, organised by course."
- Heading: "Create your account"
- Subheading: "Start taking notes in under a minute."
- Terms: "I agree to the Terms of Service and Privacy Policy, including how my
  lecture recordings are processed." (links go to `#` until the pages exist)
- Google: "Sign up with Google"
- Name label / placeholder: "Name" / "Your name"
- Email label / placeholder: "Email" / "you@university.edu"
- Password label / placeholder: "Password" / "At least 8 characters"
- Submit: "Create account with email"
- Footer: "Already have an account?" / "Log in →"

## States

- Google button is disabled until the terms box is ticked.
- Submit is disabled until the terms box is ticked, name and email are filled,
  and the password has at least 8 characters.
- On narrow screens the footer row wraps, putting the link under the text.
- Loading and error states come with the auth backend.
