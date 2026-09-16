import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye, FileText, ImageIcon, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteVaultItem, getFileUrl } from "@/lib/keepr.functions";
import {
  formatBytes,
  formatCountdown,
  itemStatus,
  type AccessRequest,
  type Profile,
  type VaultItem,
} from "@/lib/access";
import { displayName } from "@/lib/access";
import { useNow } from "@/hooks/useNow";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/keepr/StatusBadge";
import { ProtectDialog } from "@/components/keepr/ProtectDialog";
import { UnlockDialog } from "@/components/keepr/UnlockDialog";

export function VaultItemCard({
  approvers,
  item,
  onDone,
  profilesById,
  request,
}: {
  approvers: Profile[];
  item: VaultItem;
  onDone: () => void;
  profilesById: Map<string, Profile>;
  request: AccessRequest | undefined;
}) {
  const removeItem = useServerFn(deleteVaultItem);
  const fileUrl = useServerFn(getFileUrl);
  const now = useNow();
  const status = itemStatus(item, request, now);
  const [showProtect, setShowProtect] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [busy, setBusy] = useState(false);

  const approver = item.approver_id ? profilesById.get(item.approver_id) : undefined;
  const isImage = (item.mime_type ?? "").startsWith("image/");

  const countdown =
    status === "unlocked" && request?.unlock_expires_at
      ? formatCountdown(new Date(request.unlock_expires_at).getTime() - now)
      : undefined;

  async function openPrivate() {
    setBusy(true);
    try {
      const { url } = await fileUrl({ data: { itemId: item.id } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open this file");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${item.name}" permanently?`)) return;
    setBusy(true);
    try {
      await removeItem({ data: { itemId: item.id } });
      toast.success("Deleted");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-4 transition-colors hover:border-border-strong">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-2">
          {isImage ? (
            <ImageIcon className="size-4 text-muted-foreground" />
          ) : (
            <FileText className="size-4 text-muted-foreground" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatBytes(item.size_bytes)}
            {item.visibility === "protected"
              ? ` · approver ${displayName(approver)} · ${Math.round(item.unlock_seconds / 60)} min window`
              : " · private to you"}
          </p>
          <div className="mt-3">
            <StatusBadge status={status} extra={countdown} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.visibility === "protected" ? (
          <Button size="sm" onClick={() => setShowUnlock(true)}>
            Unlock
          </Button>
        ) : (
          <Button size="sm" onClick={openPrivate} disabled={busy}>
            <Eye className="size-4" />
            View
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => setShowProtect(true)}>
          <Settings2 className="size-4" />
          Protection
        </Button>
        <Button size="sm" variant="ghost" onClick={remove} disabled={busy}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      <ProtectDialog
        approvers={approvers}
        item={item}
        onDone={onDone}
        open={showProtect}
        onOpenChange={setShowProtect}
      />
      <UnlockDialog
        approver={approver}
        item={item}
        onDone={onDone}
        open={showUnlock}
        onOpenChange={setShowUnlock}
        request={request}
      />
    </div>
  );
}
