import { Pencil } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

// Spec: docs/design/components/editable-text.md
type EditableTextProps = {
  value: string;
  // Called with the trimmed text, only when it changed.
  onSave: (next: string) => void;
  // Accessible name, e.g. "Title".
  label: string;
  as?: 'h1' | 'p';
  placeholder?: string;
  // Enter saves; Shift+Enter adds a new line.
  multiline?: boolean;
  // Clearing the text puts the old value back instead of saving.
  required?: boolean;
  // Typing and pasting stop at this many characters.
  maxLength?: number;
  className?: string;
};

// Text the user edits in place, with no input box: double-click it, or use
// the pencil that shows on hover (and is the way in from the keyboard).
// Enter or clicking away saves, Esc cancels.
export function EditableText({
  value,
  onSave,
  label,
  as: Tag = 'p',
  placeholder,
  multiline = false,
  required = false,
  maxLength,
  className,
}: EditableTextProps) {
  // Fits either tag `as` renders.
  const ref = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);
  const [editing, setEditing] = useState(false);
  // Bumped after each edit, so React renders a fresh element instead of
  // patching text the user has already changed by hand.
  const [session, setSession] = useState(0);
  const cancelled = useRef(false);
  // Characters typed so far, for the counter near the limit.
  const [length, setLength] = useState(value.length);

  // Focus without losing what was clicked: a double-click has just selected
  // a word, so typing replaces it as anywhere else. Otherwise, caret at the end.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!editing || !element) return;
    const selection = window.getSelection();
    const range =
      selection?.rangeCount && element.contains(selection.anchorNode)
        ? selection.getRangeAt(0)
        : null;
    element.focus({ preventScroll: true });
    if (!selection) return;
    selection.removeAllRanges();
    if (range) {
      selection.addRange(range);
    } else {
      const end = document.createRange();
      end.selectNodeContents(element);
      end.collapse(false);
      selection.addRange(end);
    }
  }, [editing]);

  // Typed text past the limit is cut to fit; nothing goes in once it's full.
  // A native listener: React has no onBeforeInput with `inputType`.
  useEffect(() => {
    const element = ref.current;
    if (!editing || !element || maxLength === undefined) return;
    const limit = maxLength;
    function onBeforeInput(event: InputEvent) {
      // Composed text (e.g. Japanese input) can't be cancelled; finish() trims it.
      if (!event.inputType.startsWith('insert') || event.isComposing) return;
      const room = roomLeft(element!, limit);
      const incoming = event.data ?? '\n';
      if (incoming.length <= room) return;
      event.preventDefault();
      if (room > 0 && event.data) insertText(event.data.slice(0, room));
    }
    element.addEventListener('beforeinput', onBeforeInput);
    return () => element.removeEventListener('beforeinput', onBeforeInput);
  }, [editing, maxLength]);

  function startEditing() {
    cancelled.current = false;
    setLength(value.length);
    setEditing(true);
  }

  function finish() {
    const element = ref.current;
    if (!element) return;
    const raw = element.innerText;
    const clean = (multiline ? raw : raw.replace(/\s+/g, ' ')).trim();
    const next = clean.slice(0, maxLength).trim();
    setEditing(false);
    setSession((count) => count + 1);
    if (cancelled.current || next === value) return;
    if (required && next === '') return;
    onSave(next);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    // Keys typed here are text, never page shortcuts (like D for the theme).
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelled.current = true;
      ref.current?.blur();
    } else if (event.key === 'Enter' && !(multiline && event.shiftKey)) {
      event.preventDefault();
      ref.current?.blur();
    }
  }

  // Only shown in the last 10%, so it doesn't distract the rest of the time.
  const nearLimit =
    editing && maxLength !== undefined && length > maxLength * 0.9;

  return (
    <div className="min-w-0">
      <div className="group/editable flex min-w-0 items-start gap-2">
        <Tag
          key={session}
          ref={ref}
          role={editing ? 'textbox' : undefined}
          aria-label={label}
          aria-multiline={editing ? multiline : undefined}
          // Plain `true`: 'plaintext-only' isn't supported in every browser.
          // Formatting can't stick anyway, since only innerText is saved.
          contentEditable={editing}
          suppressContentEditableWarning
          spellCheck={editing}
          data-placeholder={placeholder}
          onDoubleClick={editing ? undefined : startEditing}
          onKeyDown={editing ? onKeyDown : undefined}
          onBlur={editing ? finish : undefined}
          // Paste as plain text, not the copied page's markup.
          onPaste={(event) => {
            event.preventDefault();
            const text = event.clipboardData.getData('text/plain');
            const room =
              maxLength === undefined
                ? text.length
                : roomLeft(event.currentTarget, maxLength);
            if (room > 0) insertText(text.slice(0, room));
          }}
          // Deleting everything can leave a stray <br>, which hides the
          // placeholder.
          onInput={(event) => {
            const element = event.currentTarget;
            if (element.innerText.trim() === '') element.textContent = '';
            setLength(element.innerText.length);
          }}
          className={cn(
            'min-w-0 cursor-text break-words whitespace-pre-wrap outline-none',
            'empty:before:text-muted-soft empty:before:content-[attr(data-placeholder)]',
            className,
          )}
        >
          {value}
        </Tag>
        {!editing && (
          <button
            type="button"
            aria-label={`Edit ${label.toLowerCase()}`}
            // Keep focus off the button, so it isn't the blur target.
            onMouseDown={(event) => event.preventDefault()}
            onClick={startEditing}
            className="mt-[0.3em] inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity outline-none group-hover/editable:opacity-100 hover:bg-surface-strong hover:text-ink focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="size-4" />
          </button>
        )}
      </div>
      {nearLimit && (
        <p
          aria-live="polite"
          className="mt-1 text-caption text-muted-foreground tabular-nums"
        >
          {length.toLocaleString('en-US')} / {maxLength.toLocaleString('en-US')}
        </p>
      )}
    </div>
  );
}

// How many more characters fit, counting the selection the next insert
// replaces.
function roomLeft(element: HTMLElement, maxLength: number) {
  const selection = window.getSelection();
  const selected =
    selection && element.contains(selection.anchorNode)
      ? selection.toString().length
      : 0;
  return maxLength - element.innerText.length + selected;
}

// Goes through the browser's editing, so undo still works.
function insertText(text: string) {
  document.execCommand('insertText', false, text);
}
