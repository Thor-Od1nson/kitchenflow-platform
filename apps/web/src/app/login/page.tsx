'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Loader2, LogIn, ShieldCheck, Truck, Utensils, WalletCards } from 'lucide-react';
import { Button, Card, Input } from '@kitchenflow/ui';
import { useAuth } from '@/components/auth/auth-provider';
import { getApiErrorMessage } from '@/lib/api-client';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [email, setEmail] = useState('regional.director@kitchenflow.dev');
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
    } catch (authError) {
      setError(getApiErrorMessage(authError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="noise min-h-screen bg-surface text-ink">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-5 py-8 lg:grid-cols-[1fr_430px]">
        <section className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-3 text-lg font-black leading-none">
              <span className="grid size-10 place-items-center rounded-xl bg-royal text-slate-950 shadow-soft">
                <Utensils className="size-5" />
              </span>
              <span>KitchenFlow</span>
            </Link>
            <span className="inline-flex h-7 items-center whitespace-nowrap rounded-full border border-royal/20 bg-royal/10 px-3 text-xs font-bold leading-none text-royal">
              GCC enterprise operations access
            </span>
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-ink md:text-5xl">
            One platform. Multiple aggregators. Unified operations.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted md:text-lg">
            Sign in to manage delivery queues, aggregator health, SLA risk, outlet stock, payout reconciliation, and Business Central posting from one audited workspace.
          </p>
          <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              ['99.97%', 'modeled sync uptime'],
              ['8', 'regional workspaces'],
              ['6', 'aggregator lanes']
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-line bg-panel/70 p-4">
                <p className="text-2xl font-black">{value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            {['Deliveroo', 'Talabat', 'Careem', 'Noon Food', 'HungerStation', 'Business Central'].map((channel) => (
              <span key={channel} className="rounded-full border border-line bg-panel-muted/70 px-3 py-1 text-xs font-bold text-muted">
                {channel}
              </span>
            ))}
          </div>
          <div className="mt-7 grid max-w-xl gap-3 md:grid-cols-2">
            {[
              ['Operations Controller', 'Queues, incidents, outlet SLA'],
              ['Fulfillment Director', 'Payouts, VAT, BC exports'],
              ['Regional Operations Lead', 'Prep flow, stock, handoffs'],
              ['Aggregator Control Desk', 'Webhooks, retries, channel issues']
            ].map(([role, scope]) => (
              <div key={role} className="rounded-xl border border-line bg-panel/70 p-3">
                <p className="font-black">{role}</p>
                <p className="mt-1 text-xs font-semibold text-muted">{scope}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="p-6">
          <div>
            <p className="text-sm font-semibold text-royal">Welcome back</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Sign in to operations</h2>
            <p className="mt-2 text-sm text-muted">HQ, finance, command center, and outlet teams share one live GCC control layer.</p>
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
              <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-200">
                <AlertCircle className="size-4" />
                Session expired. Sign in again to continue.
              </div>
            ) : null}

            {error ? (
              <div className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-200">
                <AlertCircle className="size-4" />
                {error}
              </div>
            ) : null}

            <Button className="w-full" type="submit" size="lg" disabled={submitting || isLoading}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              Sign in
            </Button>
          </form>
          <div className="mt-6 grid gap-3 border-t border-line pt-5 text-sm text-muted">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-4 text-royal" />
              Tenant-safe RBAC and audit logging
            </div>
            <div className="flex items-center gap-3">
              <Truck className="size-4 text-royal" />
              Live delivery and SLA telemetry
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-4 text-royal" />
              Aggregator health across GCC channels
            </div>
            <div className="flex items-center gap-3">
              <WalletCards className="size-4 text-royal" />
              Settlement and Business Central posting visibility
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
