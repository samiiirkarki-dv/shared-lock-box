import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { createUploadTarget, createVaultItem } from "@/lib/keepr.functions";
import { displayName, type Profile } from "@/lib/access";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export function UploadDialog({
  approvers,
  onDone,
}: {
  approvers: Profile[];
  onDone: () => void;
}) {
  const getTarget = useServerFn(createUploadTarget);
  const recordItem = useServerFn(createVaultItem);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<"private" | "protected">("private");
  const [approverId, setApproverId] = useState<string>("");
  const [pin, setPin] = useState("");
  const [minutes, setMinutes] = useState("5");
  const [busy, setBusy] = useState(false);

  function reset() {
    setFile(null);
    setVisibility("private");
    setApproverId("");
    setPin("");
    setMinutes("5");
  }

  async function submit() {
    if (!file) { toast.error("Choose a file first"); return; }
    if (visibility === "protected" && !approverId) {
      { toast.error("Pick a trusted person to approve access"); return; }
    }
    if (visibility === "protected" && pin && pin.length < 4) {
      { toast.error("The PIN needs at least 4 characters"); return; }
    }
    setBusy(true);
    try {
      const target = await getTarget({
        data: { fileName: file.name, sizeBytes: file.size },
      });
      const upload = await fetch(target.signedUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!upload.ok) throw new Error("The file could not be uploaded");

      await recordItem({
        data: {
          path: target.path,
          name: file.name,
          mimeType: file.type || null,
          sizeBytes: file.size,
          visibility,
          approverId: visibility === "protected" ? approverId : null,
          pin: visibility === "protected" && pin ? pin : null,
          unlockSeconds: Math.round(Number(minutes) * 60),
        },
      });
      toast.success("Added to your vault");
      setOpen(false);
      reset();
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Upload className="size-4" />
          Add a file
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Add to your vault</DialogTitle>
          <DialogDescription>
            Files are stored privately. Nobody can open them without going through Keepr.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keepr-file">Photo or file (max 25 MB)</Label>
            <Input
              id="keepr-file"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>

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
                {approvers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You need an accepted trusted connection first.
                  </p>
                ) : (
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
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="keepr-pin">Security PIN (optional)</Label>
                  <Input
                    id="keepr-pin"
                    type="password"
                    autoComplete="new-password"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder="At least 4 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keepr-minutes">Unlock window (minutes)</Label>
                  <Input
                    id="keepr-minutes"
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
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Save to vault
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
