import type { PublicNote, PublicTranscriptSegment } from '@summarise/contract';
import {
  ArrowRight,
  AudioLines,
  Check,
  ChevronLeft,
  CircleCheck,
  CircleUserRound,
  Ellipsis,
  Eye,
  EyeOff,
  FileAudio,
  Info,
  LoaderCircle,
  OctagonX,
  Pencil,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { AccountMenu } from '@/components/common/AccountMenu';
import { EditableText } from '@/components/common/EditableText';
import { FieldError } from '@/components/common/FieldError';
import { FloatingWidget } from '@/components/common/FloatingWidget';
import { GradientOrb } from '@/components/common/GradientOrb';
import { LoadingDots } from '@/components/common/LoadingDots';
import { Logo } from '@/components/common/Logo';
import { OrDivider } from '@/components/common/OrDivider';
import { PageGradient } from '@/components/common/PageGradient';
import { GoogleButton } from '@/components/google-button/GoogleButton';
import { DeleteNoteDialog } from '@/components/note/DeleteNoteDialog';
import { NoteActionsMenu } from '@/components/note/NoteActionsMenu';
import { NoteList } from '@/components/note/NoteList';
import { NotesPane } from '@/components/note/NotesPane';
import { RecordingPill } from '@/components/note/RecordingPill';
import { StatusChip } from '@/components/note/StatusChip';
import {
  TranscriptPane,
  type TranscriptMode,
} from '@/components/note/TranscriptPane';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadDialog } from '@/components/upload/UploadDialog';
import { UploadPill } from '@/components/upload/UploadPill';
import { useTheme } from '@/hooks/theme/useTheme';
import { cn } from '@/lib/utils';

import {
  COLOR_GROUPS,
  RADII,
  SPACING,
  TYPE_SCALE,
  type ColorToken,
} from './brand.data';

// A dev-only reference of Summarise's tokens and components, rendered with
// the real components so it never drifts from the app. Only registered in
// dev builds (see router.tsx).

const SECTIONS = [
  ['principles', 'Principles'],
  ['colour', 'Colour'],
  ['type', 'Type'],
  ['space', 'Space & shape'],
  ['atmosphere', 'Atmosphere & motion'],
  ['icons', 'Icons'],
  ['actions', 'Actions'],
  ['forms', 'Forms'],
  ['feedback', 'Feedback'],
  ['notes', 'Notes'],
] as const;

export function BrandGuidelinesPage() {
  return (
    <div className="relative min-h-svh overflow-clip bg-canvas">
      <PageGradient />

      <header className="relative z-10 flex h-16 items-center justify-between px-4 sm:h-20 sm:px-12">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeSwitch />
          <AccountMenu />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1064px] px-4 pt-4 pb-section sm:px-12 sm:pt-6">
        <p className="text-caption-upper text-muted-foreground uppercase">
          Dev only
        </p>
        <h1 className="mt-3 text-display-md sm:text-display-xl">
          Brand guidelines
        </h1>
        <p className="mt-5 max-w-[620px] text-body-md text-body">
          Summarise reads like a quiet print magazine that happens to be an AI
          notetaker. Ink on an off-white canvas, Newsreader Light for titles,
          Inter for everything you operate, and colour only as soft pastel
          atmosphere. Everything below is the real component or the live token
          value, so this page always matches the app. Press D to switch theme.
        </p>

        <nav
          aria-label="Sections"
          className="sticky top-0 z-20 -mx-4 mt-10 flex gap-1 overflow-x-auto border-b border-hairline bg-canvas/85 px-4 py-3 backdrop-blur sm:-mx-12 sm:px-12"
        >
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="shrink-0 rounded-full px-3 py-1.5 text-nav-link whitespace-nowrap text-muted-foreground transition-colors hover:bg-surface-strong hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>

        <Principles />
        <Colour />
        <Type />
        <SpaceAndShape />
        <AtmosphereAndMotion />
        <Icons />
        <Actions />
        <Forms />
        <Feedback />
        <Notes />
      </main>
    </div>
  );
}

// ---------------------------------------------------------------- layout

function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 pt-section">
      <p className="text-caption-upper text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-display-md sm:text-display-lg">{title}</h2>
      {intro && (
        <p className="mt-4 max-w-[620px] text-body-md text-body">{intro}</p>
      )}
      <div className="mt-10 space-y-6">{children}</div>
    </section>
  );
}

// One component: its name, what it is, and live examples on a card.
function Specimen({
  name,
  source,
  note,
  children,
  className,
}: {
  name: string;
  source: string;
  note?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-hairline px-5 py-4 sm:px-6">
        <h3 className="font-sans text-title-sm text-ink">{name}</h3>
        <code className="font-mono text-caption text-muted-foreground">
          {source}
        </code>
        {note && (
          <p className="w-full text-body-sm text-muted-foreground">{note}</p>
        )}
      </div>
      <div className={cn('bg-canvas p-5 sm:p-6', className)}>{children}</div>
    </div>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return (
    <p className="text-caption-upper text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <div className="inline-flex h-10 items-center rounded-full bg-surface-strong p-1">
      {(['light', 'dark'] as const).map((theme) => (
        <button
          key={theme}
          type="button"
          onClick={() => setTheme(theme)}
          aria-pressed={resolvedTheme === theme}
          className={cn(
            'h-full rounded-full px-4 text-nav-link capitalize transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
            resolvedTheme === theme
              ? 'bg-surface-card text-ink shadow-soft dark:bg-hairline-strong'
              : 'text-muted-foreground hover:text-ink',
          )}
        >
          {theme}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- foundations

function Principles() {
  const items = [
    [
      'The content is the colour',
      'Interfaces are ink, body and muted on canvas and card. Pastels only appear as blurred atmosphere.',
    ],
    [
      'One loud thing per view',
      'Exactly one primary pill per view. The recording dot is the only red on screen while recording.',
    ],
    [
      'Say what is happening',
      'Every background job has a visible state, a present-tense verb and a way to act on it.',
    ],
    [
      'Calm motion',
      'Three bouncing dots and a shimmer are the whole vocabulary for waiting. Everything else fades in 100–200ms.',
    ],
  ];
  return (
    <Section id="principles" eyebrow="Foundations" title="Principles">
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map(([title, body]) => (
          <div
            key={title}
            className="rounded-xl border border-hairline bg-surface-card p-6"
          >
            <p className="text-body-strong text-ink">{title}</p>
            <p className="mt-2 text-body-sm text-body">{body}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-hairline bg-surface-card p-6">
        <p className="text-body-strong text-ink">Voice</p>
        <ul className="mt-3 grid gap-2 text-body-sm text-body sm:grid-cols-2">
          <li>Sentence case. Buttons are verbs: “Delete note”, “Resume”.</li>
          <li>Work in progress ends in an ellipsis: “Transcribing…”.</li>
          <li>Errors say what to do: “Use a file of at most 500 MB”.</li>
          <li>Irreversible actions say so once: “This can’t be undone.”</li>
          <li>Curly quotes, · between meta, lowercase am/pm, no emoji.</li>
          <li>Name the thing: “Transcript ready”, not “Success!”.</li>
        </ul>
      </div>
    </Section>
  );
}

// The token's value as the browser resolves it right now, so it follows the
// theme.
function useCssVar(cssVar: string) {
  const { resolvedTheme } = useTheme();
  const [value, setValue] = useState('');
  useEffect(() => {
    // After the theme class lands on <html>.
    const frame = requestAnimationFrame(() =>
      setValue(
        getComputedStyle(document.documentElement)
          .getPropertyValue(cssVar)
          .trim(),
      ),
    );
    return () => cancelAnimationFrame(frame);
  }, [cssVar, resolvedTheme]);
  return value;
}

function Swatch({ token }: { token: ColorToken }) {
  const value = useCssVar(token.cssVar);
  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface-card">
      <div
        className="h-20 border-b border-hairline"
        style={{ background: `var(${token.cssVar})` }}
      />
      <div className="space-y-1 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-body-strong text-ink">{token.name}</p>
          <code className="font-mono text-caption text-muted-foreground uppercase">
            {value}
          </code>
        </div>
        <p className="text-caption text-muted-foreground">{token.usage}</p>
      </div>
    </div>
  );
}

function Colour() {
  return (
    <Section
      id="colour"
      eyebrow="Foundations"
      title="Colour"
      intro="Every token keeps its name in both themes; only the value changes. Switch the theme at the top to see the dark values. Orbs keep their hue and dim to 35%."
    >
      {COLOR_GROUPS.map((group) => (
        <div key={group.title} className="space-y-3">
          <Caption>{group.title}</Caption>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.tokens.map((token) => (
              <Swatch key={token.name} token={token} />
            ))}
          </div>
        </div>
      ))}
    </Section>
  );
}

function Type() {
  return (
    <Section
      id="type"
      eyebrow="Foundations"
      title="Type"
      intro="Newsreader at weight 300 is the editorial voice: titles only, never bold. Inter carries everything you read or operate. Monospace is only for numbers that tick."
    >
      <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface-card">
        {TYPE_SCALE.map((token) => (
          <div
            key={token.name}
            className="grid gap-2 px-5 py-5 sm:grid-cols-[180px_1fr] sm:gap-6 sm:px-6"
          >
            <div>
              <p className="text-body-strong text-ink">{token.name}</p>
              <p className="text-caption text-muted-foreground">
                {token.specs}
              </p>
            </div>
            <p
              className={cn(
                'min-w-0 break-words text-ink',
                token.className,
                token.display && 'font-display',
                token.upper && 'uppercase',
                token.mono && 'font-mono tabular-nums',
              )}
            >
              {token.sample}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SpaceAndShape() {
  return (
    <Section
      id="space"
      eyebrow="Foundations"
      title="Space & shape"
      intro="A 4px base, generous editorial pacing, and one shadow. Every action and badge is a pill; cards get 16px or 24px corners."
    >
      <div className="rounded-2xl border border-hairline bg-surface-card p-5 sm:p-6">
        <Caption>Spacing</Caption>
        <div className="mt-4 space-y-3">
          {SPACING.map((step) => (
            <div
              key={step.name}
              className="grid grid-cols-[72px_1fr] items-center gap-4 sm:grid-cols-[72px_120px_1fr]"
            >
              <p className="font-mono text-caption text-ink">
                {step.name} · {step.px}
              </p>
              <span
                className="h-3 rounded-full bg-ink"
                style={{ width: step.px }}
              />
              <p className="col-span-2 text-caption text-muted-foreground sm:col-span-1">
                {step.usage}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {RADII.map((radius) => (
          <div
            key={radius.name}
            className="rounded-xl border border-hairline bg-surface-card p-4"
          >
            <div
              className={cn(
                'h-16 w-full border border-hairline-strong bg-surface-strong',
                radius.className,
              )}
            />
            <p className="mt-3 text-body-strong text-ink">
              {radius.name}{' '}
              <span className="font-mono text-caption text-muted-foreground">
                {radius.value}
              </span>
            </p>
            <p className="text-caption text-muted-foreground">{radius.usage}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-hairline bg-surface-card p-6 shadow-soft">
          <p className="text-body-strong text-ink">shadow-soft</p>
          <p className="mt-1 text-caption text-muted-foreground">
            0 4px 16px rgba(0,0,0,.04) · the only shadow: pills, cards, toasts
          </p>
        </div>
        <div className="rounded-xl border border-hairline bg-surface-card p-6">
          <p className="text-body-strong text-ink">hairline</p>
          <p className="mt-1 text-caption text-muted-foreground">
            1px outlines do most of the separating
          </p>
        </div>
      </div>
    </Section>
  );
}

function AtmosphereAndMotion() {
  return (
    <Section
      id="atmosphere"
      eyebrow="Foundations"
      title="Atmosphere & motion"
      intro="Colour arrives as blurred orbs and one Sky Wash per page, never as fills or text. Waiting is shown with three bouncing dots and a shimmering verb; both stop under reduced motion."
    >
      <div className="relative h-56 overflow-hidden rounded-2xl border border-hairline bg-surface-card">
        <GradientOrb color="mint" className="-top-24 -left-16 size-[300px]" />
        <GradientOrb color="peach" className="top-6 left-[22%] size-[260px]" />
        <GradientOrb
          color="lavender"
          className="-top-20 left-[42%] size-[300px]"
        />
        <GradientOrb color="sky" className="top-4 left-[62%] size-[260px]" />
        <GradientOrb color="rose" className="-top-24 -right-16 size-[300px]" />
        <div className="absolute inset-x-6 bottom-5 flex justify-between">
          {['mint', 'peach', 'lavender', 'sky', 'rose'].map((name) => (
            <span key={name} className="text-caption-upper text-ink uppercase">
              {name}
            </span>
          ))}
        </div>
      </div>

      <Specimen
        name="LoadingDots"
        source="components/common/LoadingDots.tsx"
        className="flex flex-col gap-4"
      >
        <LoadingDots />
        <LoadingDots label="Listening…" />
        <LoadingDots label="Finishing transcript…" />
        <LoadingDots label="Transcribing the recording…" />
      </Specimen>
    </Section>
  );
}

const ICONS = [
  ['AudioLines', AudioLines, 'Wordmark'],
  ['CircleUserRound', CircleUserRound, 'Account'],
  ['Ellipsis', Ellipsis, 'Note actions'],
  ['Trash2', Trash2, 'Delete'],
  ['Upload', Upload, 'Upload'],
  ['FileAudio', FileAudio, 'Chosen file'],
  ['X', X, 'Close, remove'],
  ['Pencil', Pencil, 'Edit in place'],
  ['Eye', Eye, 'Show password'],
  ['EyeOff', EyeOff, 'Hide password'],
  ['Check', Check, 'Checkbox'],
  ['ChevronLeft', ChevronLeft, 'Back'],
  ['ArrowRight', ArrowRight, 'Open'],
  ['CircleCheck', CircleCheck, 'Success toast'],
  ['OctagonX', OctagonX, 'Error toast'],
  ['Info', Info, 'Info toast'],
  ['TriangleAlert', TriangleAlert, 'Warning toast'],
  ['LoaderCircle', LoaderCircle, 'Busy'],
] as const;

function Icons() {
  return (
    <Section
      id="icons"
      eyebrow="Foundations"
      title="Icons"
      intro="Lucide, stroke 2, in currentColor. 16px inside buttons and menus, 20px for header triggers and dialog media. The only other mark is Google’s G. No emoji."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ICONS.map(([name, Icon, use]) => (
          <div
            key={name}
            className="flex flex-col items-center gap-2 rounded-xl border border-hairline bg-surface-card px-3 py-5 text-center"
          >
            <Icon className="size-5 text-ink" />
            <p className="text-caption text-ink">{name}</p>
            <p className="text-caption text-muted-foreground">{use}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- components

function Actions() {
  return (
    <Section
      id="actions"
      eyebrow="Components"
      title="Actions"
      intro="One primary pill per view carries the main action; outline, secondary and tertiary carry the rest. Destructive only confirms a delete."
    >
      <Specimen
        name="Button"
        source="components/ui/button.tsx"
        className="space-y-5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button>Start notetaker</Button>
          <Button variant="outline">Cancel</Button>
          <Button variant="secondary">Upload a recording</Button>
          <Button variant="tertiary">Forgot password?</Button>
          <Button variant="destructive">
            <Trash2 />
            Delete note
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">Log in</Button>
          <Button size="lg" variant="outline">
            Create account
          </Button>
          <Button size="icon" variant="outline" aria-label="More">
            <Ellipsis />
          </Button>
          <Button disabled>Upload</Button>
          <Button variant="destructive" disabled>
            <LoaderCircle className="animate-spin" />
            Deleting…
          </Button>
        </div>
      </Specimen>

      <Specimen
        name="GoogleButton"
        source="components/google-button/GoogleButton.tsx"
      >
        <div className="max-w-[416px]">
          <GoogleButton type="button">Continue with Google</GoogleButton>
        </div>
      </Specimen>

      <Specimen name="Tabs" source="components/ui/tabs.tsx">
        <Tabs defaultValue="transcript">
          <TabsList>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="locked" disabled>
              Disabled
            </TabsTrigger>
          </TabsList>
          <TabsContent value="transcript" className="mt-4">
            <p className="text-body-sm text-muted-foreground">
              Transcript tab content.
            </p>
          </TabsContent>
          <TabsContent value="notes" className="mt-4">
            <p className="text-body-sm text-muted-foreground">
              Notes tab content.
            </p>
          </TabsContent>
        </Tabs>
      </Specimen>

      <Specimen
        name="Menus"
        source="AccountMenu.tsx · NoteActionsMenu.tsx"
        note="Click to open. Delete in the note menu opens the real delete dialog for a sample note."
      >
        <MenusDemo />
      </Specimen>
    </Section>
  );
}

function MenusDemo() {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="flex items-center gap-4">
      <AccountMenu />
      <NoteActionsMenu onDelete={() => setDeleting(true)} />
      <DeleteNoteDialog
        noteId="00000000-0000-0000-0000-000000000000"
        title="Lecture 4: Graphs"
        open={deleting}
        onOpenChange={setDeleting}
      />
    </div>
  );
}

function Forms() {
  const [title, setTitle] = useState('Lecture 4: Graphs');
  const [description, setDescription] = useState('');
  return (
    <Section
      id="forms"
      eyebrow="Components"
      title="Forms"
      intro="Inputs are 44px cards with a strong hairline; focus turns the border ink. Errors sit under the field and say what to do."
    >
      <Specimen
        name="Input · Label · FieldError"
        source="components/ui/input.tsx"
        className="grid gap-6 sm:grid-cols-2"
      >
        <div className="space-y-2">
          <Label htmlFor="bg-email">Email</Label>
          <Input id="bg-email" placeholder="you@university.edu" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bg-email-bad">Email</Label>
          <Input
            id="bg-email-bad"
            defaultValue="sam@"
            aria-invalid
            aria-describedby="bg-email-error"
          />
          <FieldError id="bg-email-error" message="Enter a valid email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bg-disabled">Disabled</Label>
          <Input id="bg-disabled" placeholder="Not editable" disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bg-password">Password</Label>
          <PasswordInput id="bg-password" defaultValue="hunter22hunter" />
        </div>
      </Specimen>

      <Specimen
        name="Checkbox"
        source="components/ui/checkbox.tsx"
        className="flex flex-wrap gap-8"
      >
        <label className="flex items-center gap-3 text-body-md text-ink">
          <Checkbox /> Keep audio
        </label>
        <label className="flex items-center gap-3 text-body-md text-ink">
          <Checkbox defaultChecked /> Keep audio
        </label>
        <label className="flex items-center gap-3 text-body-md text-ink">
          <Checkbox disabled /> Disabled
        </label>
      </Specimen>

      <Specimen name="OrDivider" source="components/common/OrDivider.tsx">
        <div className="max-w-[416px]">
          <OrDivider />
        </div>
      </Specimen>

      <Specimen
        name="EditableText"
        source="components/common/EditableText.tsx"
        note="Double-click the text, or hover and use the pencil. Enter saves, Esc cancels."
        className="space-y-4"
      >
        <EditableText
          as="h1"
          label="Title"
          value={title}
          required
          maxLength={200}
          onSave={setTitle}
          className="text-display-lg"
        />
        <EditableText
          label="Description"
          value={description}
          placeholder="Add a description"
          multiline
          maxLength={75}
          onSave={setDescription}
          className="text-body-md text-body"
        />
      </Specimen>
    </Section>
  );
}

const CHIP_MODES: TranscriptMode[] = [
  'recording',
  'paused',
  'finishing',
  'ready',
  'elsewhere',
  'uploading',
  'interrupted',
  'transcribing',
  'uploadPaused',
  'failed',
];

function Feedback() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  return (
    <Section
      id="feedback"
      eyebrow="Components"
      title="Feedback"
      intro="A pulsing dot means work is happening, a ring means it is waiting on you, a solid dot is settled. Every dot sits beside a word."
    >
      <Specimen
        name="StatusChip"
        source="components/note/StatusChip.tsx"
        className="flex flex-wrap gap-3"
      >
        {CHIP_MODES.map((mode) => (
          <StatusChip key={mode} mode={mode} />
        ))}
      </Specimen>

      <Specimen
        name="Toaster"
        source="components/ui/sonner.tsx"
        note="Opens real toasts at the top of the screen."
        className="flex flex-wrap gap-3"
      >
        <Button
          variant="outline"
          onClick={() => toast.error('Email or password is incorrect')}
        >
          Error
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.success('“Lecture 4: Graphs” deleted')}
        >
          Success
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.info('Transcription can’t start right now; try again shortly')
          }
        >
          Info
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.warning('Your upload will stop if you leave')}
        >
          Warning
        </Button>
      </Specimen>

      <Specimen
        name="Dialogs"
        source="ui/dialog.tsx · UploadDialog.tsx · DeleteNoteDialog.tsx"
        note="The upload dialog is the real one: uploading a file from it creates a real note. The delete dialog is under Menus above."
        className="flex flex-wrap gap-3"
      >
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          Open a dialog
        </Button>
        <Button variant="outline" onClick={() => setUploadOpen(true)}>
          Open the upload dialog
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="gap-6 rounded-3xl p-7 sm:max-w-[460px]">
            <DialogHeader className="gap-1.5">
              <DialogTitle className="font-display text-display-sm font-light text-ink">
                A dialog
              </DialogTitle>
              <DialogDescription className="text-body-sm">
                460px wide, 24px corners, 28px padding, 24px between sections.
                Buttons right-aligned, outline then primary.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
        <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      </Specimen>
    </Section>
  );
}

const SAMPLE_SEGMENTS: PublicTranscriptSegment[] = [
  {
    seq: 0,
    startMs: 0,
    endMs: 26_000,
    text: 'Okay, so last time we had gone through a bunch of different electronic signals. We talked about the basics of electricity.',
    transcriptionFailed: false,
  },
  {
    seq: 1,
    startMs: 26_000,
    endMs: 54_000,
    text: 'Ohm’s law. V equals IR. So we talked about electrons, current, resistance, voltage.',
    transcriptionFailed: false,
  },
  {
    seq: 2,
    startMs: 54_000,
    endMs: 86_000,
    text: '',
    transcriptionFailed: true,
  },
];

const PANE_MODES: TranscriptMode[] = [
  'recording',
  'finishing',
  'uploading',
  'transcribing',
  'failed',
  'interrupted',
  'ready',
];

// Fixed ids, so the rows look real; they don't open anything.
function sampleNote(
  index: number,
  patch: Partial<PublicNote> & Pick<PublicNote, 'title'>,
): PublicNote {
  const startedAt = new Date(Date.now() - index * 47 * 60_000).toISOString();
  return {
    id: `00000000-0000-0000-0000-00000000000${index}`,
    description: null,
    source: 'upload',
    status: 'ready',
    keepAudio: false,
    totalChunks: null,
    durationMs: null,
    startedAt,
    endedAt: null,
    createdAt: startedAt,
    ...patch,
  };
}

const SAMPLE_NOTES: PublicNote[] = [
  sampleNote(1, { title: 'cs207-lecture3-60min', durationMs: 3_600_000 }),
  sampleNote(2, {
    title: 'Lecture 5: Dynamic programming',
    status: 'processing',
    source: 'recording',
  }),
  sampleNote(3, { title: 'Office hours', status: 'paused' }),
  sampleNote(4, { title: 'Lab session recording', status: 'failed' }),
  sampleNote(5, { title: 'Seminar: signals', status: 'uploading' }),
];

function Notes() {
  const [paneMode, setPaneMode] = useState<TranscriptMode>('transcribing');
  const [floating, setFloating] = useState(false);
  const noop = () => undefined;
  return (
    <Section
      id="notes"
      eyebrow="Components"
      title="Notes"
      intro="The note list, the transcript and the floating controls. Floating pills never change size between states, so no button moves under the pointer."
    >
      <Specimen
        name="NoteList"
        source="components/note/NoteList.tsx"
        note="Sample notes; hover a row for the lifted card and the ⋯ menu. Rows link to notes that don’t exist."
      >
        <NoteList notes={SAMPLE_NOTES} />
      </Specimen>

      <Specimen
        name="TranscriptPane"
        source="components/note/TranscriptPane.tsx"
        className="space-y-6"
      >
        <div className="flex flex-wrap gap-2">
          {PANE_MODES.map((mode) => (
            <Button
              key={mode}
              size="default"
              variant={paneMode === mode ? 'primary' : 'outline'}
              className="h-8 px-3 text-caption"
              onClick={() => setPaneMode(mode)}
            >
              {mode}
            </Button>
          ))}
        </div>
        <TranscriptPane
          segments={paneMode === 'uploading' ? [] : SAMPLE_SEGMENTS}
          mode={paneMode}
          transcribing={false}
          uploadProgress={0.42}
        />
      </Specimen>

      <Specimen name="NotesPane" source="components/note/NotesPane.tsx">
        <NotesPane />
      </Specimen>

      <Specimen
        name="RecordingPill"
        source="components/note/RecordingPill.tsx"
        className="flex flex-col items-start gap-4"
      >
        <RecordingPill
          mode="recording"
          elapsedMs={2_559_000}
          onPause={noop}
          onResume={noop}
          onStop={noop}
        />
        <RecordingPill
          mode="paused"
          elapsedMs={2_559_000}
          onPause={noop}
          onResume={noop}
          onStop={noop}
        />
        <RecordingPill
          mode="finishing"
          elapsedMs={0}
          onPause={noop}
          onResume={noop}
          onStop={noop}
        />
      </Specimen>

      <Specimen
        name="UploadPill"
        source="components/upload/UploadPill.tsx"
        className="flex flex-col items-start gap-4"
      >
        {(['transcribing', 'uploadPaused', 'failed'] as const).map((mode) => (
          <UploadPill
            key={mode}
            mode={mode}
            busy={false}
            onPause={noop}
            onResume={noop}
            onStop={noop}
            onCancel={noop}
          />
        ))}
      </Specimen>

      <Specimen
        name="FloatingWidget"
        source="components/common/FloatingWidget.tsx"
        note="Shows the real widget at the bottom of the window. Drag it anywhere; buttons still click."
      >
        <Button variant="outline" onClick={() => setFloating((on) => !on)}>
          {floating ? 'Hide the floating widget' : 'Show the floating widget'}
        </Button>
        {floating && (
          <FloatingWidget label="Recording controls">
            <RecordingPill
              mode="recording"
              elapsedMs={2_559_000}
              onPause={noop}
              onResume={noop}
              onStop={() => setFloating(false)}
            />
          </FloatingWidget>
        )}
      </Specimen>

      <Specimen
        name="Not shown here"
        source="LiveNoteCard · AuthLayout"
        note="LiveNoteCard needs a live recording in this browser (start one from Home). AuthLayout is the whole Login and Signup page: log out to see it."
      >
        <Button variant="tertiary" asChild>
          <a href="/">
            Go to Home <ArrowRight className="size-4" />
          </a>
        </Button>
      </Specimen>
    </Section>
  );
}
