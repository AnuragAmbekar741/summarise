import * as React from 'react';

import { Logo } from '@/components/Logo';

// Spec: docs/design/components/auth-layout.md
type AuthLayoutProps = {
  // Pill button at the top right, e.g. a link to the other auth page.
  navAction: React.ReactNode;
  headline: React.ReactNode;
  description: string;
  // GradientOrb elements placed behind the page.
  orbs: React.ReactNode;
  // Card content.
  children: React.ReactNode;
};

export function AuthLayout({
  navAction,
  headline,
  description,
  orbs,
  children,
}: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-canvas">
      {orbs}

      <header className="relative z-10 flex h-16 items-center justify-between px-4 pt-4 sm:px-12">
        <Logo />
        {navAction}
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-content flex-1 grid-cols-1 items-center gap-12 px-4 py-12 sm:px-12 lg:grid-cols-[1fr_416px] lg:gap-24">
        <section>
          <h1 className="text-display-md sm:text-display-xl lg:text-display-mega">
            {headline}
          </h1>
          <p className="mt-8 max-w-[420px] text-body-md text-body">
            {description}
          </p>
        </section>

        <div className="w-full max-w-[416px] justify-self-center rounded-2xl border border-hairline bg-surface-card p-6 shadow-soft sm:p-8 lg:justify-self-end">
          {children}
        </div>
      </main>
    </div>
  );
}
