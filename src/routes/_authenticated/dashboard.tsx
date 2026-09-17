import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Lock, ShieldCheck, Users } from "lucide-react";

import { KeeprScreen } from "@/components/keepr/KeeprScreen";
import { ApprovalCard } from "@/components/keepr/ApprovalCard";
import { UploadDialog } from "@/components/keepr/UploadDialog";
import { VaultItemCard } from "@/components/keepr/VaultItemCard";
import { displayName, latestRequestFor } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Keepr" },
      {
        name: "description",
        content: "Your vault, protected files, trusted connections and pending approvals.",
      },
      { property: "og:title", content: "Dashboard — Keepr" },
      { property: "og:description", content: "See what is locked, pending and unlocked." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <KeeprScreen title="Dashboard" subtitle="Everything that needs your attention, in one place.">
      {({ data, profilesById, refresh, trusted, userId }) => {
        const mine = data.items.filter((item) => item.owner_id === userId);
        const protectedFiles = mine.filter((item) => item.visibility === "protected");
        const unread = data.notifications.filter((n) => !n.read).length;
        const toApprove = data.requests.filter(
          (r) => r.approver_id === userId && r.status === "pending",
        );
        const connectionRequests = data.connections.filter(
          (c) => c.status === "pending" && c.addressee_id === userId,
        );

        const stats = [
          { icon: Lock, label: "Files in vault", value: mine.length, to: "/vault" as const },
          {
            icon: ShieldCheck,
            label: "Protected files",
            value: protectedFiles.length,
            to: "/vault" as const,
          },
          {
            icon: Users,
            label: "Trusted connections",
            value: trusted.length,
            to: "/connections" as const,
          },
          {
            icon: Bell,
            label: "Unread notifications",
            value: unread,
            to: "/notifications" as const,
          },
        ];

        return (
          <div className="space-y-10">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <Link
                  key={stat.label}
                  to={stat.to}
                  className="glass rounded-2xl p-5 transition-colors hover:border-border-strong"
                >
                  <span className="grid size-9 place-items-center rounded-xl border border-border bg-surface-2">
                    <stat.icon className="size-4 text-primary" />
                  </span>
                  <p className="mt-4 font-display text-3xl font-semibold tracking-tight">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </Link>
              ))}
            </div>

            {toApprove.length > 0 ? (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-semibold">Approvals waiting on you</h2>
                {toApprove.map((request) => (
                  <ApprovalCard
                    key={request.id}
                    item={data.items.find((i) => i.id === request.item_id)}
                    onDone={refresh}
                    request={request}
                    requester={profilesById.get(request.requester_id)}
                  />
                ))}
              </section>
            ) : null}

            {connectionRequests.length > 0 ? (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-semibold">Connection requests</h2>
                <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
                  <p className="min-w-0 flex-1 text-sm">
                    {connectionRequests
                      .map((c) => displayName(profilesById.get(c.requester_id)))
                      .join(", ")}{" "}
                    {connectionRequests.length === 1 ? "wants" : "want"} to connect with you.
                  </p>
                  <Link
                    to="/connections"
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Review
                  </Link>
                </div>
              </section>
            ) : null}

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">Protected files</h2>
                <UploadDialog approvers={trusted} onDone={refresh} />
              </div>
              {protectedFiles.length === 0 ? (
                <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
                  Nothing is protected yet. Add a file, or open a file in your vault and switch it to
                  Protected to require approval before it opens.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {protectedFiles.map((item) => (
                    <VaultItemCard
                      key={item.id}
                      approvers={trusted}
                      item={item}
                      onDone={refresh}
                      profilesById={profilesById}
                      request={latestRequestFor(item, data.requests)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">Recent activity</h2>
                <Link to="/activity" className="text-sm text-muted-foreground hover:text-foreground">
                  View all
                </Link>
              </div>
              {data.activity.length === 0 ? (
                <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
                  Your activity history will appear here.
                </div>
              ) : (
                <ul className="glass divide-y divide-border/70 overflow-hidden rounded-2xl">
                  {data.activity.slice(0, 6).map((event) => (
                    <li key={event.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-4">
                      <p className="min-w-0 flex-1 text-sm">{event.message}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleTimeString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        );
      }}
    </KeeprScreen>
  );
}
