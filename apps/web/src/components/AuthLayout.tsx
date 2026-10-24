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
    <div className="relative min-h-svh overflow-hidden bg-canvas">
      {orbs}

      {/* Overlays the page so the content centres in the full viewport. */}
      <header className="absolute inset-x-0 top-0 z-20 flex h-16 items-center justify-between px-4 pt-4 sm:px-12">
        <Logo />
        {navAction}
      </header>

      <main className="relative z-10 mx-auto grid min-h-svh w-full max-w-content grid-cols-1 content-center items-center gap-12 px-4 py-24 sm:px-12 lg:grid-cols-[1fr_416px] lg:gap-24 lg:pt-16 lg:pb-6">
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
