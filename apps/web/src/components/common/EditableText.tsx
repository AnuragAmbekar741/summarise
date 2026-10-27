import { Pencil } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';

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
  className,
}: EditableTextProps) {
  // Fits either tag `as` renders.
  const ref = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);
  const [editing, setEditing] = useState(false);
  // Bumped after each edit, so React renders a fresh element instead of
  // patching text the user has already changed by hand.
  const [session, setSession] = useState(0);
  const cancelled = useRef(false);

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

  function startEditing() {
    cancelled.current = false;
    setEditing(true);
  }

  function finish() {
    const element = ref.current;
    if (!element) return;
    const raw = element.innerText;
    const next = (multiline ? raw : raw.replace(/\s+/g, ' ')).trim();
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

  return (
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
          document.execCommand('insertText', false, text);
        }}
        // Deleting everything can leave a stray <br>, which hides the
        // placeholder.
        onInput={(event) => {
          const element = event.currentTarget;
          if (element.innerText.trim() === '') element.textContent = '';
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
  );
}
