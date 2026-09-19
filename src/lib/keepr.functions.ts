import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_BYTES = 25 * 1024 * 1024;

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Simple per-user sliding-window rate limit backed by the database. */
async function rateLimit(userId: string, action: string, max: number, windowSeconds: number) {
  const admin = await getAdmin();
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count, error } = await admin
    .from("rate_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", since);
  if (error) throw new Error("Could not verify rate limit");
  if ((count ?? 0) >= max) {
    throw new Error("Too many attempts. Please wait a moment and try again.");
  }
  await admin.from("rate_events").insert({ user_id: userId, action });
}

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

/** Step 1 of upload: get a one-time signed upload URL scoped to the user's own folder. */
export const createUploadTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        fileName: z.string().min(1).max(200),
        sizeBytes: z.number().int().positive().max(MAX_BYTES),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await rateLimit(context.userId, "upload", 30, 300);
    const admin = await getAdmin();
    const path = `${context.userId}/${crypto.randomUUID()}-${sanitizeName(data.fileName)}`;
    const { data: signed, error } = await admin.storage.from("vault").createSignedUploadUrl(path);
    if (error || !signed) throw new Error("Could not start the upload");
    return { path, signedUrl: signed.signedUrl, token: signed.token };
  });

/** Step 2 of upload: record the file, its privacy level, approver and hashed PIN. */
export const createVaultItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        path: z.string().min(1),
        name: z.string().min(1).max(200),
        mimeType: z.string().max(200).nullable(),
        sizeBytes: z.number().int().nonnegative().max(MAX_BYTES),
        visibility: z.enum(["private", "protected"]),
        approverId: z.string().uuid().nullable(),
        pin: z.string().min(4).max(64).nullable(),
        unlockSeconds: z.number().int().min(30).max(3600),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/`)) {
      throw new Error("Invalid storage path");
    }
    const { hashPin } = await import("./pin.server");
    const pin_hash = data.visibility === "protected" && data.pin ? await hashPin(data.pin) : null;

    const { data: item, error } = await context.supabase
      .from("vault_items")
      .insert({
        owner_id: context.userId,
        name: data.name,
        storage_path: data.path,
        mime_type: data.mimeType,
        size_bytes: data.sizeBytes,
        visibility: data.visibility,
        approver_id: data.visibility === "protected" ? data.approverId : null,
        pin_hash,
        unlock_seconds: data.unlockSeconds,
      })
      .select("id")
      .single();

    if (error) {
      const admin = await getAdmin();
      await admin.storage.from("vault").remove([data.path]);
      throw new Error(error.message);
    }
    return { id: item.id };
  });

/** Change a file between private and protected, set the approver, PIN and unlock window. */
export const updateProtection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        itemId: z.string().uuid(),
        visibility: z.enum(["private", "protected"]),
        approverId: z.string().uuid().nullable(),
        // null = leave PIN unchanged, "" = remove PIN, otherwise set a new PIN
        pin: z.string().max(64).nullable(),
        unlockSeconds: z.number().int().min(30).max(3600),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: {
      visibility: string;
      approver_id: string | null;
      unlock_seconds: number;
      pin_hash?: string | null;
    } = {
      visibility: data.visibility,
      approver_id: data.visibility === "protected" ? data.approverId : null,
      unlock_seconds: data.unlockSeconds,
    };

    if (data.visibility === "private") {
      patch['pin_hash'] = null;
    } else if (data.pin === "") {
      patch['pin_hash'] = null;
    } else if (data.pin !== null) {
      if (data.pin.length < 4) throw new Error("PIN must be at least 4 characters");
      const { hashPin } = await import("./pin.server");
      patch['pin_hash'] = await hashPin(data.pin);
    }

    const { error } = await context.supabase
      .from("vault_items")
      .update(patch)
      .eq("id", data.itemId)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);

    // any outstanding grant/request for this file is void once protection changes
    const admin = await getAdmin();
    await admin
      .from("access_requests")
      .update({ status: "cancelled", unlock_expires_at: null, pin_verified: false })
      .eq("item_id", data.itemId)
      .in("status", ["pending", "approved"]);

    return { ok: true };
  });

/** Owner asks their trusted connection for permission to open a protected file. */
export const requestAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ itemId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await rateLimit(context.userId, "access_request", 12, 300);

    const { data: item, error: itemError } = await context.supabase
      .from("vault_items")
      .select("id,owner_id,visibility,approver_id")
      .eq("id", data.itemId)
      .maybeSingle();
    if (itemError) throw new Error(itemError.message);
    if (!item || item.owner_id !== context.userId) throw new Error("File not found");
    if (item.visibility !== "protected" || !item.approver_id) {
      throw new Error("This file is not protected");
    }

    const admin = await getAdmin();
    await admin
      .from("access_requests")
      .update({ status: "cancelled" })
      .eq("item_id", item.id)
      .eq("status", "pending");

    const { data: request, error } = await context.supabase
      .from("access_requests")
      .insert({
        item_id: item.id,
        requester_id: context.userId,
        approver_id: item.approver_id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { requestId: request.id };
  });

/** After approval: verify the PIN (when set) and open the time-limited unlock window. */
export const beginUnlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ requestId: z.string().uuid(), pin: z.string().max(64).optional() })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await rateLimit(context.userId, "unlock", 40, 300);
    const admin = await getAdmin();

    const { data: request } = await admin
      .from("access_requests")
      .select("id,item_id,requester_id,status,pin_attempts,unlock_expires_at")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!request || request.requester_id !== context.userId) throw new Error("Request not found");
    if (request.status !== "approved") throw new Error("This request has not been approved");
    if (request.unlock_expires_at && new Date(request.unlock_expires_at).getTime() > Date.now()) {
      return { ok: true as const, unlockExpiresAt: request.unlock_expires_at };
    }
    if (request.unlock_expires_at) {
      return {
        ok: false as const,
        message: "This access window already expired. Request approval again.",
      };
    }

    const { data: item } = await admin
      .from("vault_items")
      .select("id,pin_hash,unlock_seconds")
      .eq("id", request.item_id)
      .single();
    if (!item) throw new Error("File not found");

    if (item.pin_hash) {
      if (!data.pin) return { ok: false as const, message: "This file needs its security PIN" };
      if ((request.pin_attempts ?? 0) >= 5) {
        await admin.from("access_requests").update({ status: "cancelled" }).eq("id", request.id);
        return {
          ok: false as const,
          message: "Too many incorrect PIN attempts. Request approval again.",
        };
      }
      const { verifyPin } = await import("./pin.server");
      const ok = await verifyPin(data.pin, item.pin_hash);
      if (!ok) {
        await admin
          .from("access_requests")
          .update({ pin_attempts: (request.pin_attempts ?? 0) + 1 })
          .eq("id", request.id);
        return { ok: false as const, message: "Incorrect PIN" };
      }
    }

    const unlockExpiresAt = new Date(Date.now() + item.unlock_seconds * 1000).toISOString();
    const { error } = await admin
      .from("access_requests")
      .update({ pin_verified: true, unlock_expires_at: unlockExpiresAt })
      .eq("id", request.id);
    if (error) throw new Error(error.message);
    return { ok: true as const, unlockExpiresAt };
  });

/**
 * Returns a short-lived signed URL for a file the caller is allowed to open.
 * Private files: owner only. Protected files: owner only, and only while an
 * approved, PIN-verified, unexpired access window is open.
 */
export const getFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ itemId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin();
    const { data: item } = await admin
      .from("vault_items")
      .select("id,owner_id,storage_path,visibility,pin_hash")
      .eq("id", data.itemId)
      .maybeSingle();
    if (!item || item.owner_id !== context.userId) throw new Error("File not found");

    if (item.visibility === "protected") {
      const { data: grants } = await admin
        .from("access_requests")
        .select("id,status,pin_verified,unlock_expires_at")
        .eq("item_id", item.id)
        .eq("requester_id", context.userId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(1);
      const grant = grants?.[0];
      const open =
        grant &&
        grant.unlock_expires_at &&
        new Date(grant.unlock_expires_at).getTime() > Date.now() &&
        (!item.pin_hash || grant.pin_verified);
      if (!open) throw new Error("This file is locked");
    }

    const { data: signed, error } = await admin.storage
      .from("vault")
      .createSignedUrl(item.storage_path, 60);
    if (error || !signed) throw new Error("Could not open the file");
    return { url: signed.signedUrl };
  });

export const deleteVaultItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ itemId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: item } = await context.supabase
      .from("vault_items")
      .select("id,owner_id,storage_path")
      .eq("id", data.itemId)
      .maybeSingle();
    if (!item || item.owner_id !== context.userId) throw new Error("File not found");

    const admin = await getAdmin();
    await admin.storage.from("vault").remove([item.storage_path]);
    const { error } = await context.supabase.from("vault_items").delete().eq("id", item.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Whether a file currently has a PIN, without ever exposing the hash. */
export const itemHasPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ itemId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin();
    const { data: item } = await admin
      .from("vault_items")
      .select("owner_id,pin_hash")
      .eq("id", data.itemId)
      .maybeSingle();
    if (!item || item.owner_id !== context.userId) throw new Error("File not found");
    return { hasPin: Boolean(item.pin_hash) };
  });
