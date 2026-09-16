import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Loader2, Lock, LockOpen, ShieldQuestion, XCircle } from "lucide-react";
import { toast } from "sonner";

import { beginUnlock, getFileUrl, itemHasPin, requestAccess } from "@/lib/keepr.functions";
import {
  displayName,
  formatCountdown,
  itemStatus,
  type AccessRequest,
  type Profile,
  type VaultItem,
} from "@/lib/access";
import { useNow } from "@/hooks/useNow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UnlockDialog({
  approver,
  item,
  onDone,
  onOpenChange,
  open,
  request,
}: {
  approver: Profile | undefined;
  item: VaultItem;
  onDone: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  request: AccessRequest | undefined;
}) {
  const ask = useServerFn(requestAccess);
  const unlock = useServerFn(beginUnlock);
  const fileUrl = useServerFn(getFileUrl);
  const checkPin = useServerFn(itemHasPin);

  const now = useNow();
  const status = itemStatus(item, request, now);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [hasPin, setHasPin] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPin("");
      setPreview(null);
      return;
    }
    checkPin({ data: { itemId: item.id } })
      .then((result) => setHasPin(result.hasPin))
      .catch(() => setHasPin(true));
  }, [open, item.id, checkPin]);

  async function doRequest() {
    setBusy(true);
    try {
      await ask({ data: { itemId: item.id } });
      toast.success(`Permission requested from ${displayName(approver)}`);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the request");
    } finally {
      setBusy(false);
    }
  }

  async function doUnlock() {
    if (!request) return;
    setBusy(true);
    try {
      await unlock({
        data: { requestId: request.id, ...(hasPin ? { pin } : {}) },
      });
      toast.success("Unlocked — the file will lock itself again soon");
      setPin("");
      onDone();
    } catch (error) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      toast.error(error instanceof Error ? error.message : "Could not unlock");
    } finally {
      setBusy(false);
    }
  }

  async function openFile() {
    setBusy(true);
    try {
      const { url } = await fileUrl({ data: { itemId: item.id } });
      if ((item.mime_type ?? "").startsWith("image/")) setPreview(url);
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "This file is locked");
    } finally {
      setBusy(false);
    }
  }

  const remaining =
    request?.unlock_expires_at && status === "unlocked"
      ? new Date(request.unlock_expires_at).getTime() - now
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={shake ? "max-w-md animate-shake" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle className="font-display">Security check</DialogTitle>
          <DialogDescription className="truncate">{item.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface/60 py-8">
            <span
              className={
                status === "unlocked"
                  ? "grid size-16 place-items-center rounded-full border border-success/40 bg-success/10 animate-pulse-ring"
                  : "grid size-16 place-items-center rounded-full border border-border-strong bg-surface-2"
              }
            >
              {status === "unlocked" ? (
                <LockOpen className="size-7 text-success" />
              ) : status === "pending" ? (
                <Clock className="size-7 text-warning" />
              ) : status === "denied" ? (
                <XCircle className="size-7 text-destructive" />
              ) : status === "awaiting_pin" ? (
                <ShieldQuestion className="size-7 text-primary" />
              ) : (
                <Lock className="size-7 text-muted-foreground" />
              )}
            </span>
            <p className="max-w-xs text-center text-sm text-muted-foreground">
              {status === "locked" &&
                `This file is protected. ${displayName(approver)} must approve before it opens.`}
              {status === "pending" &&
                `Waiting for ${displayName(approver)} to approve. This updates on its own.`}
              {status === "denied" &&
                `${displayName(approver)} denied this request. You can ask again.`}
              {status === "awaiting_pin" &&
                (hasPin
                  ? "Approved. Enter your security PIN to open the unlock window."
                  : "Approved. Open the unlock window when you're ready.")}
              {status === "unlocked" && "Unlocked. Access closes automatically."}
              {status === "expired" && "The access window expired and the file locked itself again."}
            </p>
            {status === "unlocked" ? (
              <p className="font-mono text-2xl font-semibold text-success">
                {formatCountdown(remaining)}
              </p>
            ) : null}
          </div>

          {status === "awaiting_pin" && hasPin ? (
            <div className="space-y-2">
              <Label htmlFor="unlock-pin">Security PIN</Label>
              <Input
                id="unlock-pin"
                type="password"
                autoComplete="off"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void doUnlock();
                }}
              />
            </div>
          ) : null}

          {preview ? (
            <img
              src={preview}
              alt={item.name}
              className="max-h-72 w-full rounded-xl border border-border object-contain"
            />
          ) : null}

          <div className="flex flex-wrap gap-2">
            {(status === "locked" || status === "denied" || status === "expired") && (
              <Button onClick={doRequest} disabled={busy} className="flex-1">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldQuestion className="size-4" />}
                Request permission
              </Button>
            )}
            {status === "pending" && (
              <Button variant="secondary" disabled className="flex-1">
                <Loader2 className="size-4 animate-spin" />
                Waiting for approval
              </Button>
            )}
            {status === "awaiting_pin" && (
              <Button onClick={doUnlock} disabled={busy} className="flex-1">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <LockOpen className="size-4" />}
                Unlock
              </Button>
            )}
            {status === "unlocked" && (
              <Button onClick={openFile} disabled={busy} className="flex-1">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <LockOpen className="size-4" />}
                View file
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
