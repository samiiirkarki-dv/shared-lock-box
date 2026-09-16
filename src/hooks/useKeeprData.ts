import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  ITEM_COLUMNS,
  type AccessRequest,
  type ActivityEvent,
  type Connection,
  type Notification,
  type Profile,
  type VaultItem,
} from "@/lib/access";

export type KeeprData = {
  me: Profile | null;
  profiles: Profile[];
  connections: Connection[];
  items: VaultItem[];
  requests: AccessRequest[];
  notifications: Notification[];
  activity: ActivityEvent[];
};

const REALTIME_TABLES = [
  "connections",
  "vault_items",
  "access_requests",
  "notifications",
  "activity_events",
] as const;

async function fetchKeeprData(userId: string): Promise<KeeprData> {
  const [me, profiles, connections, items, requests, notifications, activity] = await Promise.all([
    supabase.from("profiles").select("id,username,display_name").eq("id", userId).maybeSingle(),
    supabase.from("profiles").select("id,username,display_name").limit(500),
    supabase.from("connections").select("*").order("created_at", { ascending: false }),
    supabase.from("vault_items").select(ITEM_COLUMNS).order("created_at", { ascending: false }),
    supabase.from("access_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
    supabase
      .from("activity_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return {
    me: (me.data as Profile | null) ?? null,
    profiles: (profiles.data as Profile[] | null) ?? [],
    connections: (connections.data as Connection[] | null) ?? [],
    items: (items.data as VaultItem[] | null) ?? [],
    requests: (requests.data as AccessRequest[] | null) ?? [],
    notifications: (notifications.data as Notification[] | null) ?? [],
    activity: (activity.data as ActivityEvent[] | null) ?? [],
  };
}

export function useKeeprData(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["keepr", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchKeeprData(userId!),
    staleTime: 5_000,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`keepr-realtime-${userId}`);
    for (const table of REALTIME_TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        queryClient.invalidateQueries({ queryKey: ["keepr", userId] });
      });
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
}

export function useKeeprRefresh(userId: string | undefined) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["keepr", userId] });
}
