import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { displayName, type AccessRequest, type Profile, type VaultItem } from "@/lib/access";
import { Button } from "@/components/ui/button";

export function ApprovalCard({
  item,
  onDone,
  request,
  requester,
}: {
  item: VaultItem | undefined;
  onDone: () => void;
  request: AccessRequest;
  requester: Profile | undefined;
}) {
  const [busy, setBusy] = useState(false);

  async function decide(status: "approved" | "denied") {
    setBusy(true);
    const { error } = await supabase
      .from("access_requests")
      .update({ status })
      .eq("id", request.id)
      .eq("status", "pending");
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "approved" ? "Access approved" : "Access denied");
    onDone();
  }

  return (
    <div className="glass flex flex-wrap items-center gap-4 rounded-2xl p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-medium">{displayName(requester)}</span> asked to open{" "}
          <span className="font-medium">{item?.name ?? "a protected file"}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Requested {new Date(request.created_at).toLocaleString()}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => decide("approved")} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Approve
        </Button>
        <Button size="sm" variant="secondary" onClick={() => decide("denied")} disabled={busy}>
          <X className="size-4" />
          Deny
        </Button>
      </div>
    </div>
  );
}
