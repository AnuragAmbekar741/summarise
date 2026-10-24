import { ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { AuthLayout } from '@/components/AuthLayout';
import { GoogleButton } from '@/components/GoogleButton';
import { GradientOrb } from '@/components/GradientOrb';
import { OrDivider } from '@/components/OrDivider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Spec: docs/design/pages/signup.md
export function SignupPage() {
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState('');
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
          <Link to="/login">Log in</Link>
        </Button>
      }
      headline={
        <>
          Never miss
          <br />a word again.
        </>
      }
      description="Record any lecture and get a searchable transcript plus AI notes, organised by course."
      orbs={
        <>
          <GradientOrb
            color="lavender"
            className="top-[20%] left-[20%] size-[720px] -translate-1/2"
          />
          <GradientOrb
            color="sky"
            className="top-[30%] left-[92%] size-[640px] -translate-1/2"
          />
          <GradientOrb
            color="mint"
            className="top-[88%] left-[54%] size-[640px] -translate-1/2"
          />
          <GradientOrb
            color="rose"
            className="top-[100%] left-[76%] size-[480px] -translate-1/2"
          />
        </>
      }
    >
      <h2 className="text-display-lg">Create your account</h2>
      <p className="mt-3 text-body-md text-body">
        Start taking notes in under a minute.
      </p>

      <div className="mt-8 flex gap-3 rounded-xl border border-hairline bg-canvas-soft p-4">
        <Checkbox
          id="agree"
          className="mt-0.5"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked === true)}
        />
        <label htmlFor="agree" className="text-body-sm text-body">
          I agree to the{' '}
          <a href="#" className="font-medium text-ink underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="font-medium text-ink underline">
            Privacy Policy
          </a>
          , including how my lecture recordings are processed.
        </label>
      </div>

      <GoogleButton className="mt-6" disabled={!agreed}>
        Sign up with Google
      </GoogleButton>

      <div className="my-6">
        <OrDivider />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Your name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
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
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
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
          disabled={!agreed || !name || !email || password.length < 8}
        >
          Create account with email
        </Button>
      </form>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-6">
        <span className="text-body-md whitespace-nowrap text-body">
          Already have an account?
        </span>
        <Button variant="secondary" className="px-4" asChild>
          <Link to="/login">
            Log in
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
