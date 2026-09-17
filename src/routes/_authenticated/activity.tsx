import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";

import { KeeprScreen } from "@/components/keepr/KeeprScreen";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "Recent activity — Keepr" },
      { name: "description", content: "A history of vault approvals, requests and connections." },
      { property: "og:title", content: "Recent activity — Keepr" },
      { property: "og:description", content: "Every approval and unlock, in order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  return (
    <KeeprScreen title="Recent activity" subtitle="A plain record of what happened, and when.">
      {({ data }) =>
        data.activity.length === 0 ? (
          <div className="glass flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-2xl border border-border bg-surface-2">
              <Activity className="size-5 text-muted-foreground" />
            </span>
            <p className="font-display text-lg font-semibold">Nothing has happened yet</p>
          </div>
        ) : (
          <ol className="glass divide-y divide-border/70 overflow-hidden rounded-2xl">
            {data.activity.map((event) => (
              <li key={event.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-4">
                <p className="min-w-0 flex-1 text-sm">{event.message}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {new Date(event.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )
      }
    </KeeprScreen>
  );
}
