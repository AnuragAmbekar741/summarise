# Signup

Where a new user creates an account, with Google or with name, email and
password. They must agree to the terms first. The "Log in" pill in the nav leads to
login.

**Route:** `/signup`
**Source:** `apps/web/src/pages/auth/SignupPage.tsx`

## Layout

Uses [`AuthLayout`](../components/auth-layout.md). Card content, top to
bottom:

1. Heading and subheading
2. Terms box: checkbox + agreement text
3. Google button
4. OR divider
5. Name, Email and Password fields
6. Create account button

## Components

| Component                                                                              | Variant                     | Where                               |
| -------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------- |
| [`Button`](../components/button.md)                                                    | `outline`                   | Nav: "Log in"                       |
| [`Checkbox`](../components/checkbox.md)                                                | —                           | Terms box                           |
| [`GoogleButton`](../components/google-button.md)                                       | —                           | Below the terms box                 |
| [`OrDivider`](../components/or-divider.md)                                             | —                           | Between Google and email            |
| [`Label`](../components/label.md) + [`Input`](../components/input.md)                  | —                           | Name, Email                         |
| [`Label`](../components/label.md) + [`PasswordInput`](../components/password-input.md) | —                           | Password, with show/hide toggle     |
| [`Button`](../components/button.md)                                                    | `outline`, `lg`, full width | Submit: "Create account with email" |

## Typography & spacing

Spacing is tighter than on login so the whole card fits on screen without
scrolling.

| Piece         | Token                                                    | Spacing                                       |
| ------------- | -------------------------------------------------------- | --------------------------------------------- |
| Heading       | `{typography.display-lg}`                                | —                                             |
| Subheading    | `{typography.body-md}`, body                             | 8px below heading                             |
| Terms box     | `{typography.body-sm}`, body; links ink, 500, underlined | 24px below subheading; 16px padding, 12px gap |
| Google button | —                                                        | 20px below terms box                          |
| OR divider    | —                                                        | 16px above and below                          |
| Field label   | `{typography.body-strong}`                               | 8px above its input                           |
| Fields        | —                                                        | 16px between fields                           |
| Submit        | —                                                        | 16px below last field                         |

Terms box: `{colors.canvas-soft}` background, 1px `{colors.hairline}` border,
`{rounded.lg}` (12px).

## Atmosphere

[`PageGradient`](../components/page-gradient.md), via `AuthLayout`.

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

## States

- Google button is disabled until the terms box is ticked.
- Submit is disabled until the terms box is ticked and name, email and
  password are filled.
- On submit, the fields are checked against `SignupSchema` from
  `@summarise/contract`. A failing field gets the red input border and a
  [`FieldError`](../components/field-error.md) under it (e.g. "Use at least 8
  characters").
- While the request runs, submit is disabled and reads "Creating account…".
- Server errors (e.g. "An account with this email already exists") show as an
  error [toast](../components/toaster.md).
- On success the user goes to `/`. Signed-in users who open `/signup` are sent
  to `/` too.
