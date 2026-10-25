import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema } from '@summarise/contract';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { AuthLayout } from '@/components/auth-layout/AuthLayout';
import { GoogleButton } from '@/components/google-button/GoogleButton';
import { FieldError } from '@/components/common/FieldError';
import { GradientOrb } from '@/components/common/GradientOrb';
import { OrDivider } from '@/components/common/OrDivider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { useLogin } from '@/hooks/auth/useLogin';

// Spec: docs/design/pages/login.md
export function LoginPage() {
  const loginMutation = useLogin();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });
  const [email, password] = useWatch({
    control,
    name: ['email', 'password'],
  });

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

      {/* noValidate: the zod schema shows its own messages under each field. */}
      <form
        noValidate
        onSubmit={handleSubmit((values) => loginMutation.mutate(values))}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-3">
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
        <div className="flex flex-col gap-3">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Your password"
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
          className="mt-1 w-full"
          disabled={!email || !password || loginMutation.isPending}
        >
          {loginMutation.isPending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
