// Client-safe shared types and status helpers for vault access state.

export type VaultItem = {
  id: string;
  owner_id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number;
  visibility: string;
  approver_id: string | null;
  unlock_seconds: number;
  created_at: string;
};

export type AccessRequest = {
  id: string;
  item_id: string;
  requester_id: string;
  approver_id: string;
  status: string;
  pin_verified: boolean;
  unlock_expires_at: string | null;
  decided_at: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
};

export type Connection = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  title: string;
  body: string | null;
  entity_id: string | null;
  read: boolean;
  created_at: string;
};

export type ActivityEvent = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  message: string;
  created_at: string;
};

export const ITEM_COLUMNS =
  "id,owner_id,name,storage_path,mime_type,size_bytes,visibility,approver_id,unlock_seconds,created_at";

export type ItemStatus =
  | "private"
  | "locked"
  | "pending"
  | "denied"
  | "awaiting_pin"
  | "unlocked"
  | "expired";

export function latestRequestFor(
  item: VaultItem,
  requests: AccessRequest[],
): AccessRequest | undefined {
  return requests
    .filter((r) => r.item_id === item.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

export function itemStatus(
  item: VaultItem,
  request: AccessRequest | undefined,
  now: number,
): ItemStatus {
  if (item.visibility !== "protected") return "private";
  if (!request) return "locked";
  if (request.status === "pending") return "pending";
  if (request.status === "denied") return "denied";
  if (request.status === "approved") {
    if (!request.unlock_expires_at) return "awaiting_pin";
    return new Date(request.unlock_expires_at).getTime() > now ? "unlocked" : "expired";
  }
  return "locked";
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  private: "Private",
  locked: "Locked",
  pending: "Pending approval",
  denied: "Denied",
  awaiting_pin: "Security check",
  unlocked: "Unlocked",
  expired: "Expired — locked",
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function displayName(p: Profile | undefined): string {
  if (!p) return "Unknown member";
  return p.display_name?.trim() || p.username;
}
