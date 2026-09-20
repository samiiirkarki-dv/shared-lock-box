import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

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

function Mark() {
  return (
    <span className="grid size-8 place-items-center bg-primary">
      <span className="grid size-4 place-items-center rounded-full border-2 border-background">
        <span className="size-1 rounded-full bg-background" />
      </span>
    </span>
  );
}

const STEPS = [
  "You press Unlock on a protected file.",
  "Your trusted person is notified instantly.",
  "They approve, you confirm your PIN.",
  "The file opens, then locks itself again.",
];

function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex w-full max-w-6xl items-center justify-between">
        <span className="flex items-center gap-2.5">
          <Mark />
          <span className="font-mono text-lg font-bold uppercase tracking-tighter">Keepr</span>
        </span>
        <Link
          to="/auth"
          className="mono-label text-muted-foreground transition-colors hover:text-primary"
        >
          Sign in
        </Link>
      </header>

      <section className="animate-rise mt-20 w-full max-w-4xl text-center sm:mt-28">
        <span className="inline-flex items-center gap-2 border border-primary/25 bg-primary/5 px-3 py-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <span className="mono-label text-primary">Approval required</span>
        </span>
        <h1 className="mt-7 text-5xl font-bold leading-[0.92] tracking-tighter sm:text-7xl">
          Privacy requires
          <br />
          <span className="text-gradient italic">permission.</span>
        </h1>
        <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          A private vault where files stay locked until a person you trust approves. Built for the
          photos and documents you would not put anywhere else.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center gap-2 bg-foreground px-8 py-4 text-sm font-bold tracking-tight text-background transition-colors hover:bg-primary"
          >
            CREATE YOUR VAULT
            <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center border border-border-strong px-8 py-4 text-sm font-bold tracking-tight transition-colors hover:bg-surface"
          >
            I ALREADY HAVE AN ACCOUNT
          </Link>
        </div>
      </section>

      <section className="mt-28 grid w-full max-w-6xl grid-cols-12 gap-3 sm:mt-36">
        <div className="col-span-12 flex min-h-[320px] flex-col justify-between border border-border bg-surface p-8 sm:p-12 lg:col-span-8">
          <div className="max-w-md">
            <p className="mono-label text-primary">Protocol_01</p>
            <h2 className="mt-4 text-3xl font-bold italic tracking-tight">Trusted approval</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              A protected file cannot be opened by its own owner alone. The person you nominate is
              asked, live, and only their approval starts the unlock.
            </p>
          </div>
          <div className="mt-12 flex items-center gap-4">
            <span className="grid size-12 place-items-center border border-border">
              <span className="size-5 border border-primary/40" />
            </span>
            <span className="relative h-px flex-1 bg-border">
              <span className="absolute left-0 top-0 h-px w-1/3 bg-primary" />
            </span>
          </div>
        </div>

        <div className="col-span-12 border border-border bg-surface p-8 sm:col-span-6 lg:col-span-4">
          <p className="mono-label text-muted-foreground">Sec_var_02</p>
          <h2 className="mt-4 text-xl font-bold tracking-tight">Optional PIN</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            A second layer asked even after approval. Hashed on the server, never stored as readable
            text.
          </p>
        </div>

        <div className="col-span-12 border border-border bg-surface p-8 sm:col-span-6 lg:col-span-4">
          <p className="mono-label text-muted-foreground">Sec_var_03</p>
          <h2 className="mt-4 text-xl font-bold tracking-tight">Closing window</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Access is time-limited. When the window runs out the file locks itself again, with no
            action from you.
          </p>
        </div>

        <div className="col-span-12 grid gap-3 sm:grid-cols-2 lg:col-span-8">
          <div className="flex items-center justify-between border border-border bg-surface p-8">
            <span>
              <span className="block font-bold">Server-checked</span>
              <span className="mono-label text-muted-foreground">Authorisation</span>
            </span>
            <span className="size-2 rounded-full bg-primary/60" />
          </div>
          <div className="flex items-center justify-between border border-border bg-surface p-8">
            <span>
              <span className="block font-bold">Live requests</span>
              <span className="mono-label text-muted-foreground">No refreshing</span>
            </span>
            <span className="size-2 rounded-full bg-border-strong" />
          </div>
        </div>
      </section>

      <section className="mt-3 w-full max-w-6xl border border-border bg-surface p-8 sm:p-12">
        <p className="mono-label text-muted-foreground">Sequence</p>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">How an unlock works</h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step} className="border-t border-border pt-4">
              <span className="mono-label text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-20 w-full max-w-6xl border-t border-border pt-8">
        <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Keepr uses server-side checks, hashed PINs and time-limited access. No system is perfectly
          secure — please keep your own backups of anything irreplaceable.
        </p>
      </footer>
    </div>
  );
}
