# Login

Where a returning user signs in, with Google or with email and password. The
"Create account" pill in the nav leads to signup.

**Route:** `/login`
**Source:** `apps/web/src/pages/LoginPage.tsx`

## Layout

Uses [`AuthLayout`](../components/auth-layout.md). Card content, top to
bottom:

1. Heading and subheading
2. Google button
3. OR divider
4. Email field
5. Password field
6. Log in button

## Components

| Component                                                             | Variant                     | Where                    |
| --------------------------------------------------------------------- | --------------------------- | ------------------------ |
| [`Button`](../components/button.md)                                   | `outline`                   | Nav: "Create account"    |
| [`GoogleButton`](../components/google-button.md)                      | —                           | Card top                 |
| [`OrDivider`](../components/or-divider.md)                            | —                           | Between Google and email |
| [`Label`](../components/label.md) + [`Input`](../components/input.md) | —                           | Email, Password          |
| [`Button`](../components/button.md)                                   | `outline`, `lg`, full width | Submit: "Log in"         |

## Typography & spacing

| Piece         | Token                        | Spacing               |
| ------------- | ---------------------------- | --------------------- |
| Heading       | `{typography.display-lg}`    | —                     |
| Subheading    | `{typography.body-md}`, body | 12px below heading    |
| Google button | —                            | 32px below subheading |
| OR divider    | —                            | 24px above and below  |
| Field label   | `{typography.body-strong}`   | 12px above its input  |
| Fields        | —                            | 20px between fields   |
| Submit        | —                            | 24px below last field |

## Atmosphere

| Orb        | Position (centre) | Size  |
| ---------- | ----------------- | ----- |
| `peach`    | 14% left, 8% top  | 720px |
| `lavender` | 86% left, 30% top | 720px |
| `mint`     | 54% left, 96% top | 640px |
| `sky`      | 68% left, 92% top | 520px |

## Copy

- Nav: "Create account"
- Headline: "Every lecture, / written down."
- Description: "Hit record in class. Summarise listens, transcribes, and writes
  clean notes while you focus on the lecture."
- Heading: "Welcome back"
- Subheading: "Log in to your notes."
- Google: "Continue with Google"
- Email label / placeholder: "Email" / "you@university.edu"
- Password label / placeholder: "Password" / "Your password"
- Submit: "Log in"

## States

- Submit is disabled until both email and password are filled.
- Loading and error states come with the auth backend.
