import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { KeeprScreen } from "@/components/keepr/KeeprScreen";
import { ApprovalCard } from "@/components/keepr/ApprovalCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Keepr" },
      { name: "description", content: "Live requests, approvals and connection updates." },
      { property: "og:title", content: "Notifications — Keepr" },
      { property: "og:description", content: "Approval requests arrive here instantly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <KeeprScreen title="Notifications" subtitle="Requests and decisions arrive here instantly.">
      {({ data, profilesById, refresh, userId }) => {
        const unread = data.notifications.filter((n) => !n.read);
        const toApprove = data.requests.filter(
          (r) => r.approver_id === userId && r.status === "pending",
        );

        async function markAllRead() {
          const { error } = await supabase
            .from("notifications")
            .update({ read: true })
            .eq("user_id", userId)
            .eq("read", false);
          if (error) {
            toast.error(error.message);
            return;
          }
          refresh();
        }

        return (
          <div className="space-y-8">
            {toApprove.length > 0 ? (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-semibold">Waiting for your decision</h2>
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

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">
                  All notifications
                  {unread.length > 0 ? (
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                      {unread.length} new
                    </span>
                  ) : null}
                </h2>
                {unread.length > 0 ? (
                  <Button size="sm" variant="secondary" onClick={markAllRead}>
                    <CheckCheck className="size-4" />
                    Mark all read
                  </Button>
                ) : null}
              </div>

              {data.notifications.length === 0 ? (
                <div className="glass flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
                  <span className="grid size-12 place-items-center rounded-2xl border border-border bg-surface-2">
                    <Bell className="size-5 text-muted-foreground" />
                  </span>
                  <p className="font-display text-lg font-semibold">No notifications yet</p>
                </div>
              ) : (
                <ul className="glass divide-y divide-border/70 overflow-hidden rounded-2xl">
                  {data.notifications.map((note) => (
                    <li
                      key={note.id}
                      className={cn("flex gap-3 p-4", !note.read && "bg-primary/[0.04]")}
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          note.read ? "bg-border-strong" : "bg-primary",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{note.title}</p>
                        {note.body ? (
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {note.body}
                          </p>
                        ) : null}
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {new Date(note.created_at).toLocaleString()}
                        </p>
                      </div>
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
