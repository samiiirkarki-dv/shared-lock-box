import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Loader2, Search, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { KeeprScreen } from "@/components/keepr/KeeprScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { displayName, type Profile } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/connections")({
  head: () => ({
    meta: [
      { title: "Trusted connections — Keepr" },
      { name: "description", content: "Find people by username and manage trusted connections." },
      { property: "og:title", content: "Trusted connections — Keepr" },
      { property: "og:description", content: "Approvals only work between trusted connections." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConnectionsPage,
});

function Avatar({ profile }: { profile: Profile | undefined }) {
  const label = displayName(profile).charAt(0).toUpperCase();
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-2 font-display text-sm text-primary">
      {label}
    </span>
  );
}

function ConnectionsPage() {
  return (
    <KeeprScreen
      title="Trusted connections"
      subtitle="Approvals only work between people who trust each other."
    >
      {({ data, profilesById, refresh, userId }) => (
        <ConnectionsBody
          data={data}
          profilesById={profilesById}
          refresh={refresh}
          userId={userId}
        />
      )}
    </KeeprScreen>
  );
}

function ConnectionsBody({
  data,
  profilesById,
  refresh,
  userId,
}: {
  data: import("@/hooks/useKeeprData").KeeprData;
  profilesById: Map<string, Profile>;
  refresh: () => void;
  userId: string;
}) {
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState(false);

  const related = new Set(
    data.connections.flatMap((c) => [c.requester_id, c.addressee_id]).filter((id) => id !== userId),
  );
  const results = term.trim()
    ? data.profiles.filter(
        (p) =>
          p.id !== userId &&
          !related.has(p.id) &&
          (p.username.toLowerCase().includes(term.trim().toLowerCase()) ||
            (p.display_name ?? "").toLowerCase().includes(term.trim().toLowerCase())),
      )
    : [];

  const incoming = data.connections.filter(
    (c) => c.status === "pending" && c.addressee_id === userId,
  );
  const outgoing = data.connections.filter(
    (c) => c.status === "pending" && c.requester_id === userId,
  );
  const accepted = data.connections.filter((c) => c.status === "accepted");

  async function sendRequest(targetId: string) {
    setBusy(true);
    const { error } = await supabase
      .from("connections")
      .insert({ requester_id: userId, addressee_id: targetId });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Request already exists" : error.message);
      return;
    }
    toast.success("Request sent");
    setTerm("");
    refresh();
  }

  async function decide(id: string, status: "accepted" | "declined") {
    setBusy(true);
    const { error } = await supabase
      .from("connections")
      .update({ status })
      .eq("id", id)
      .eq("status", "pending");
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "accepted" ? "Trusted connection added" : "Request declined");
    refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this connection?")) return;
    setBusy(true);
    const { error } = await supabase.from("connections").delete().eq("id", id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Connection removed");
    refresh();
  }

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Find someone</h2>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by username"
            className="pl-9"
          />
        </div>
        {term.trim() ? (
          results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one new matches that username.</p>
          ) : (
            <ul className="glass divide-y divide-border/70 overflow-hidden rounded-2xl">
              {results.slice(0, 8).map((person) => (
                <li key={person.id} className="flex items-center gap-3 p-4">
                  <Avatar profile={person} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{displayName(person)}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      @{person.username}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => sendRequest(person.id)} disabled={busy}>
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <UserPlus className="size-4" />
                    )}
                    Connect
                  </Button>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>

      {incoming.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Requests for you</h2>
          <ul className="glass divide-y divide-border/70 overflow-hidden rounded-2xl">
            {incoming.map((connection) => (
              <li key={connection.id} className="flex items-center gap-3 p-4">
                <Avatar profile={profilesById.get(connection.requester_id)} />
                <p className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-medium">
                    {displayName(profilesById.get(connection.requester_id))}
                  </span>{" "}
                  wants to connect
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => decide(connection.id, "accepted")}
                    disabled={busy}
                  >
                    <Check className="size-4" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => decide(connection.id, "declined")}
                    disabled={busy}
                  >
                    <X className="size-4" />
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {outgoing.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Waiting on them</h2>
          <ul className="glass divide-y divide-border/70 overflow-hidden rounded-2xl">
            {outgoing.map((connection) => (
              <li key={connection.id} className="flex items-center gap-3 p-4">
                <Avatar profile={profilesById.get(connection.addressee_id)} />
                <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  Request sent to{" "}
                  <span className="font-medium text-foreground">
                    {displayName(profilesById.get(connection.addressee_id))}
                  </span>
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(connection.id)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Your trusted people</h2>
        {accepted.length === 0 ? (
          <div className="glass flex flex-col items-center gap-3 rounded-3xl px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-2xl border border-border bg-surface-2">
              <Users className="size-5 text-muted-foreground" />
            </span>
            <p className="font-display text-lg font-semibold">No trusted connections yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Search for someone's username above. Once they accept, you can choose them to approve
              access to your protected files.
            </p>
          </div>
        ) : (
          <ul className="glass divide-y divide-border/70 overflow-hidden rounded-2xl">
            {accepted.map((connection) => {
              const otherId =
                connection.requester_id === userId ? connection.addressee_id : connection.requester_id;
              const person = profilesById.get(otherId);
              return (
                <li key={connection.id} className="flex items-center gap-3 p-4">
                  <Avatar profile={person} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{displayName(person)}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      @{person?.username ?? "unknown"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(connection.id)}
                    disabled={busy}
                  >
                    Remove
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
