import { GradientOrb } from '@/components/common/GradientOrb';

// Spec: docs/design/components/page-gradient.md
// The atmosphere at the top right of full pages. Dark mode keeps sky and
// peach; light mode uses a lighter sky alone. The parent must be `relative`
// and `overflow-hidden`.
export function PageGradient() {
  return (
    <>
      <GradientOrb
        color="sky"
        className="-top-72 right-[18%] size-[720px] opacity-50 dark:opacity-(--orb-opacity)"
      />
      <GradientOrb
        color="peach"
        className="-top-64 -right-64 hidden size-[720px] dark:block"
      />
    </>
  );
}
