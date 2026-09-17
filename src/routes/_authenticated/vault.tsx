import { createFileRoute } from "@tanstack/react-router";
import { Vault } from "lucide-react";

import { KeeprScreen } from "@/components/keepr/KeeprScreen";
import { UploadDialog } from "@/components/keepr/UploadDialog";
import { VaultItemCard } from "@/components/keepr/VaultItemCard";
import { latestRequestFor } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { title: "My vault — Keepr" },
      { name: "description", content: "Your private photos and files, with protection settings." },
      { property: "og:title", content: "My vault — Keepr" },
      { property: "og:description", content: "Private and protected files in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VaultPage,
});

function VaultPage() {
  return (
    <KeeprScreen title="My vault" subtitle="Everything here is private until you decide otherwise.">
      {({ data, profilesById, refresh, trusted, userId }) => {
        const mine = data.items.filter((item) => item.owner_id === userId);
        return (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {mine.length} {mine.length === 1 ? "file" : "files"} ·{" "}
                {mine.filter((i) => i.visibility === "protected").length} protected
              </p>
              <UploadDialog approvers={trusted} onDone={refresh} />
            </div>

            {mine.length === 0 ? (
              <div className="glass flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
                <span className="grid size-12 place-items-center rounded-2xl border border-border bg-surface-2">
                  <Vault className="size-5 text-muted-foreground" />
                </span>
                <p className="font-display text-lg font-semibold">Your vault is empty</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Add a photo or document. You can keep it to yourself, or require approval from a
                  trusted person before it opens.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {mine.map((item) => (
                  <VaultItemCard
                    key={item.id}
                    approvers={trusted}
                    item={item}
                    onDone={refresh}
                    profilesById={profilesById}
                    request={latestRequestFor(item, data.requests)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      }}
    </KeeprScreen>
  );
}
