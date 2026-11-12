import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { RedirectIfAuthed } from '@/components/route-guard/RedirectIfAuthed';
import { RequireAuth } from '@/components/route-guard/RequireAuth';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { NotePage } from '@/pages/note/NotePage';

// Dev only: `import.meta.env.DEV` is false in a production build, so the
// page and its chunk are left out of it entirely.
const BrandGuidelinesPage = import.meta.env.DEV
  ? lazy(() =>
      import('@/pages/dev/BrandGuidelinesPage').then((module) => ({
        default: module.BrandGuidelinesPage,
      })),
    )
  : null;

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/notes/:noteId" element={<NotePage />} />
          {BrandGuidelinesPage && (
            <Route
              path="/brand-guidelines"
              element={
                <Suspense fallback={null}>
                  <BrandGuidelinesPage />
                </Suspense>
              }
            />
          )}
        </Route>
        <Route element={<RedirectIfAuthed />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
