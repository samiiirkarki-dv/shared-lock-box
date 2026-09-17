import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Clock, KeyRound, Lock, Shield, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Keepr — a private vault for trusted people" },
      {
        name: "description",
        content:
          "Keepr stores private photos and files, and keeps the sensitive ones locked until someone you trust approves access.",
      },
      { property: "og:title", content: "Keepr — a private vault for trusted people" },
      {
        property: "og:description",
        content:
          "Protected files need approval from a trusted connection, an optional PIN, and lock themselves again automatically.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Users,
    title: "Trusted connections",
    body: "Find someone by username, send a request, and share control once they accept.",
  },
  {
    icon: Lock,
    title: "Private or protected",
    body: "Keep a file to yourself, or require approval from the person you choose.",
  },
  {
    icon: Bell,
    title: "Instant requests",
    body: "Approvals arrive live — no refreshing, no waiting, no guessing.",
  },
  {
    icon: KeyRound,
    title: "Security PIN",
    body: "Add a PIN on top of approval. It is hashed and never stored as readable text.",
  },
  {
    icon: Clock,
    title: "Time-limited access",
    body: "Unlocked files close themselves when the window runs out.",
  },
  {
    icon: Shield,
    title: "Checked on the server",
    body: "Every open is authorised server-side, so links and requests can't be tampered with.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
        <span className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl border border-border bg-surface">
            <Shield className="size-4 text-primary" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Keepr</span>
        </span>
        <Link
          to="/auth"
          className="ml-auto rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-border-strong"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <section className="animate-rise py-16 sm:py-24">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Private vault · shared control
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Your most private files, opened only with someone you trust.
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Keepr holds your photos and documents privately. Mark one as protected and it stays
            locked until your trusted person approves — then it opens for a short while and locks
            itself again.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Create your vault
            </Link>
            <Link
              to="/auth"
              className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium transition-colors hover:border-border-strong"
            >
              I already have an account
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="glass rounded-2xl p-5">
              <span className="grid size-10 place-items-center rounded-xl border border-border bg-surface-2">
                <feature.icon className="size-4 text-primary" />
              </span>
              <h2 className="mt-4 font-display text-base font-semibold">{feature.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </section>

        <section className="glass mt-16 rounded-3xl p-6 sm:p-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight">How an unlock works</h2>
          <ol className="mt-6 grid gap-5 sm:grid-cols-4">
            {[
              "You press Unlock on a protected file.",
              "Your trusted person is notified instantly.",
              "They approve, you confirm your PIN.",
              "The file opens, then locks itself again.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10 font-mono text-xs text-primary">
                  {index + 1}
                </span>
                <span className="text-sm text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-border/70 py-8">
        <p className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground sm:px-6">
          Keepr uses strong server-side checks, hashed PINs and time-limited access. No system is
          perfectly secure — please keep your own backups of anything irreplaceable.
        </p>
      </footer>
    </div>
  );
}
