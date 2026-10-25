import { zodResolver } from '@hookform/resolvers/zod';
import { SignupSchema } from '@summarise/contract';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { AuthLayout } from '@/components/auth-layout/AuthLayout';
import { GoogleButton } from '@/components/google-button/GoogleButton';
import { FieldError } from '@/components/common/FieldError';
import { GradientOrb } from '@/components/common/GradientOrb';
import { OrDivider } from '@/components/common/OrDivider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSignup } from '@/hooks/auth/useSignup';

// The API fields plus the terms box, which only the form needs.
const SignupFormSchema = SignupSchema.extend({
  agreed: z.boolean().refine(Boolean, 'Agree to the terms to continue'),
});

// Spec: docs/design/pages/signup.md
export function SignupPage() {
  const signupMutation = useSignup();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(SignupFormSchema),
    defaultValues: { agreed: false, name: '', email: '', password: '' },
  });
  const [agreed, name, email, password] = useWatch({
    control,
    name: ['agreed', 'name', 'email', 'password'],
  });

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
      <p className="mt-2 text-body-md text-body">
        Start taking notes in under a minute.
      </p>

      <div className="mt-5 flex gap-3 rounded-xl border border-hairline bg-canvas-soft p-4">
        <Controller
          control={control}
          name="agreed"
          render={({ field }) => (
            <Checkbox
              id="agree"
              className="mt-0.5"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
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

      <GoogleButton className="mt-5" disabled={!agreed}>
        Sign up with Google
      </GoogleButton>

      <div className="my-4">
        <OrDivider />
      </div>

      {/* noValidate: the zod schema shows its own messages under each field. */}
      <form
        noValidate
        onSubmit={handleSubmit(({ name, email, password }) =>
          signupMutation.mutate({ name, email, password }),
        )}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Your name"
            aria-invalid={!!errors.name}
            aria-describedby="name-error"
            {...register('name')}
          />
          <FieldError id="name-error" message={errors.name?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            aria-invalid={!!errors.email}
            aria-describedby="email-error"
            {...register('email')}
          />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            aria-invalid={!!errors.password}
            aria-describedby="password-error"
            {...register('password')}
          />
          <FieldError id="password-error" message={errors.password?.message} />
        </div>
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={
            !agreed || !name || !email || !password || signupMutation.isPending
          }
        >
          {signupMutation.isPending
            ? 'Creating account…'
            : 'Create account with email'}
        </Button>
      </form>
    </AuthLayout>
  );
}
