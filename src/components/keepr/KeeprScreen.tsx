import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { useSession } from "@/hooks/useSession";
import { useKeeprData, useKeeprRefresh, type KeeprData } from "@/hooks/useKeeprData";
import { AppShell } from "@/components/keepr/AppShell";
import type { Profile } from "@/lib/access";

export type KeeprScreenContext = {
  data: KeeprData;
  profilesById: Map<string, Profile>;
  trusted: Profile[];
  refresh: () => void;
  userId: string;
};

/** Shared loading/auth/data plumbing for every signed-in screen. */
export function KeeprScreen({
  children,
  subtitle,
  title,
}: {
  children: (ctx: KeeprScreenContext) => ReactNode;
  subtitle?: string;
  title: string;
}) {
  const { user } = useSession();
  const query = useKeeprData(user?.id);
  const refresh = useKeeprRefresh(user?.id);
  const data = query.data;

  if (!user || !data) {
    return (
      <AppShell title={title} {...(subtitle ? { subtitle } : {})}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your vault…
        </div>
      </AppShell>
    );
  }

  const profilesById = new Map(data.profiles.map((p) => [p.id, p]));
  const trusted = data.connections
    .filter((c) => c.status === "accepted")
    .map((c) => (c.requester_id === user.id ? c.addressee_id : c.requester_id))
    .map((id) => profilesById.get(id))
    .filter((p): p is Profile => Boolean(p));
  const unread = data.notifications.filter((n) => !n.read).length;

  return (
    <AppShell title={title} unread={unread} {...(subtitle ? { subtitle } : {})}>
      {children({ data, profilesById, trusted, refresh, userId: user.id })}
    </AppShell>
  );
}
