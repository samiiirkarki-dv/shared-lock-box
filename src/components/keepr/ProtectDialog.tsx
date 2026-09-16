import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { itemHasPin, updateProtection } from "@/lib/keepr.functions";
import { displayName, type Profile, type VaultItem } from "@/lib/access";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProtectDialog({
  approvers,
  item,
  onDone,
  onOpenChange,
  open,
}: {
  approvers: Profile[];
  item: VaultItem;
  onDone: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const save = useServerFn(updateProtection);
  const checkPin = useServerFn(itemHasPin);

  const [visibility, setVisibility] = useState<"private" | "protected">(
    item.visibility === "protected" ? "protected" : "private",
  );
  const [approverId, setApproverId] = useState(item.approver_id ?? "");
  const [pin, setPin] = useState("");
  const [removePin, setRemovePin] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [minutes, setMinutes] = useState(String(Math.round(item.unlock_seconds / 60)));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVisibility(item.visibility === "protected" ? "protected" : "private");
    setApproverId(item.approver_id ?? "");
    setPin("");
    setRemovePin(false);
    setMinutes(String(Math.round(item.unlock_seconds / 60)));
    checkPin({ data: { itemId: item.id } })
      .then((result) => setHasPin(result.hasPin))
      .catch(() => setHasPin(false));
  }, [open, item, checkPin]);

  async function submit() {
    if (visibility === "protected" && !approverId) {
      { toast.error("Pick a trusted person to approve access"); return; }
    }
    if (visibility === "protected" && !removePin && pin && pin.length < 4) {
      { toast.error("The PIN needs at least 4 characters"); return; }
    }
    setBusy(true);
    try {
      await save({
        data: {
          itemId: item.id,
          visibility,
          approverId: visibility === "protected" ? approverId : null,
          pin: removePin ? "" : pin ? pin : null,
          unlockSeconds: Math.round(Number(minutes) * 60),
        },
      });
      toast.success("Protection updated");
      onOpenChange(false);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Protection settings</DialogTitle>
          <DialogDescription className="truncate">{item.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Privacy</Label>
            <Select
              value={visibility}
              onValueChange={(value) => setVisibility(value as "private" | "protected")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private — only you</SelectItem>
                <SelectItem value="protected">Protected — needs approval to open</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibility === "protected" ? (
            <div className="space-y-4 rounded-xl border border-border bg-surface/60 p-4">
              <div className="space-y-2">
                <Label>Who approves access?</Label>
                <Select value={approverId} onValueChange={setApproverId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a trusted person" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvers.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {displayName(person)} · @{person.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="protect-pin">
                    {hasPin ? "Replace security PIN" : "Security PIN (optional)"}
                  </Label>
                  <Input
                    id="protect-pin"
                    type="password"
                    autoComplete="new-password"
                    value={pin}
                    disabled={removePin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder={hasPin ? "Leave blank to keep current PIN" : "At least 4 characters"}
                  />
                  {hasPin ? (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={removePin}
                        onChange={(event) => setRemovePin(event.target.checked)}
                      />
                      Remove the PIN (approval only)
                    </label>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protect-minutes">Unlock window (minutes)</Label>
                  <Input
                    id="protect-minutes"
                    type="number"
                    min={1}
                    max={60}
                    value={minutes}
                    onChange={(event) => setMinutes(event.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Save settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
