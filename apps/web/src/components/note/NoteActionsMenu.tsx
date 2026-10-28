import { Ellipsis, Trash2 } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type NoteActionsMenuProps = {
  // Names the note for screen readers, e.g. in a list of them.
  label?: string;
  onDelete: () => void;
  className?: string;
};

// The ⋯ menu of a note. The dialog it opens lives outside it, so the menu
// can close first.
export function NoteActionsMenu({
  label = 'More actions',
  onDelete,
  className,
}: NoteActionsMenuProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={label}
        className={cn(
          'inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors outline-none hover:bg-surface-strong focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-surface-strong',
          className,
        )}
      >
        <Ellipsis className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          Delete note
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
