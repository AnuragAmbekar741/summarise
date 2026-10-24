import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { AuthLayout } from '@/components/auth-layout/AuthLayout';
import { GoogleButton } from '@/components/google-button/GoogleButton';
import { GradientOrb } from '@/components/common/GradientOrb';
import { OrDivider } from '@/components/common/OrDivider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Spec: docs/design/pages/login.md
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Wired to the API when the auth backend lands.
    event.preventDefault();
  }

  return (
    <AuthLayout
      navAction={
        <Button variant="outline" asChild>
          <Link to="/signup">Create account</Link>
        </Button>
      }
      headline={
        <>
          Every lecture,
          <br />
          written down.
        </>
      }
      description="Hit record in class. Summarise listens, transcribes, and writes clean notes while you focus on the lecture."
      orbs={
        <>
          <GradientOrb
            color="peach"
            className="top-[8%] left-[14%] size-[720px] -translate-1/2"
          />
          <GradientOrb
            color="lavender"
            className="top-[30%] left-[86%] size-[720px] -translate-1/2"
          />
          <GradientOrb
            color="mint"
            className="top-[96%] left-[54%] size-[640px] -translate-1/2"
          />
          <GradientOrb
            color="sky"
            className="top-[92%] left-[68%] size-[520px] -translate-1/2"
          />
        </>
      }
    >
      <h2 className="text-display-lg">Welcome back</h2>
      <p className="mt-3 text-body-md text-body">Log in to your notes.</p>

      <GoogleButton className="mt-8">Continue with Google</GoogleButton>

      <div className="my-6">
        <OrDivider />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-3">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="mt-1 w-full"
          disabled={!email || !password}
        >
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}
