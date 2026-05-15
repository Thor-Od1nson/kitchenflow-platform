'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Loader2, LogIn, Utensils } from 'lucide-react';
import { Button, Card, Input } from '@kitchenflow/ui';
import { useAuth } from '@/components/auth/auth-provider';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [email, setEmail] = useState('owner@kitchenflow.dev');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSessionExpired(new URLSearchParams(window.location.search).get('reason') === 'session-expired');
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      setError('Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface text-ink">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_420px]">
        <section className="max-w-2xl">
          <Link href="/" className="inline-flex items-center gap-3 text-lg font-black">
            <span className="grid size-10 place-items-center rounded-xl bg-ink text-white">
              <Utensils className="size-5" />
            </span>
            KitchenFlow
          </Link>
          <h1 className="mt-10 text-4xl font-black tracking-tight text-ink md:text-6xl">
            Sign in to restaurant operations.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted md:text-lg">
            Manage live orders, menus, integrations, analytics, inventory, and outlets from one workspace.
          </p>
        </section>

        <Card className="p-6">
          <div>
            <p className="text-sm font-semibold text-muted">Welcome back</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Login</h2>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-bold">Email</span>
              <Input
                className="mt-2"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold">Password</span>
              <Input
                className="mt-2"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {sessionExpired ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                <AlertCircle className="size-4" />
                Session expired. Sign in again to continue.
              </div>
            ) : null}

            {error ? (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                <AlertCircle className="size-4" />
                {error}
              </div>
            ) : null}

            <Button className="w-full" type="submit" size="lg" disabled={submitting || isLoading}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
