import { useEffect, useRef, useState } from 'react';

// Spec: docs/design/components/floating-widget.md
// Gap kept between the widget and the edges of the window.
const MARGIN = 16;

type Drag = {
  pointerX: number;
  pointerY: number;
  offset: { x: number; y: number };
  // Where the widget was when the drag started.
  rect: DOMRect;
};

// Floats its children over the page, bottom middle, and lets the user drag
// them anywhere in the window. Buttons inside still click as normal.
export function FloatingWidget({
  label,
  children,
}: {
  // Accessible name for the group, e.g. "Recording controls".
  label: string;
  children: React.ReactNode;
}) {
  // How far it has been dragged from bottom middle.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<Drag | null>(null);

  // A smaller window could leave it out of sight, so start over.
  useEffect(() => {
    const onResize = () => setOffset({ x: 0, y: 0 });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (event.button !== 0 || target.closest('button')) return;
    drag.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offset,
      rect: event.currentTarget.getBoundingClientRect(),
    };
    // Keeps the moves coming even when the pointer outruns the widget.
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start) return;
    const { rect } = start;
    const dx = clamp(
      event.clientX - start.pointerX,
      MARGIN - rect.left,
      window.innerWidth - MARGIN - rect.right,
    );
    const dy = clamp(
      event.clientY - start.pointerY,
      MARGIN - rect.top,
      window.innerHeight - MARGIN - rect.bottom,
    );
    setOffset({ x: start.offset.x + dx, y: start.offset.y + dy });
  }

  function endDrag() {
    drag.current = null;
  }

  return (
    <div
      role="group"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)`,
      }}
      className="fixed bottom-6 left-1/2 z-50 cursor-grab touch-none rounded-full shadow-soft select-none active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
