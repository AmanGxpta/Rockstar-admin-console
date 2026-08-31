import { Webhook } from "svix";

import { createSupabaseAdminClient } from "@/lib/supabase";

/**
 * Clerk -> Supabase user mirror.
 *
 * Every RLS policy in the schema resolves the caller through
 * `public.users.clerk_id = auth.jwt() ->> 'sub'`, so a Clerk account with no
 * row here can read nothing and write nothing. This endpoint is what creates
 * that row, which makes it the hinge the whole authorisation model hangs on.
 *
 * It runs with the service role because it is the one operation that has no
 * user to act as: the row it inserts is the thing the policies key off.
 */

type ClerkEmail = { id: string; email_address: string };

type ClerkUser = {
  id: string;
  primary_email_address_id: string | null;
  email_addresses: ClerkEmail[];
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  // Set from the Clerk dashboard or at invitation time. Anything we do not
  // recognise falls back to 'student' — an unknown value must never widen
  // access, and 'admin' is never inferred.
  public_metadata?: { role?: unknown };
};

const ROLES = ["student", "educator", "admin", "super-admin"] as const;
type Role = (typeof ROLES)[number];

function roleOf(user: ClerkUser): Role {
  const claimed = user.public_metadata?.role;
  return typeof claimed === "string" && (ROLES as readonly string[]).includes(claimed)
    ? (claimed as Role)
    : "student";
}

function emailOf(user: ClerkUser): string | null {
  const primary = user.email_addresses.find(
    (e) => e.id === user.primary_email_address_id,
  );
  return primary?.email_address ?? user.email_addresses[0]?.email_address ?? null;
}

function nameOf(user: ClerkUser): string | null {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return name || null;
}

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SIGNING_SECRET is not set");
    return new Response("Webhook not configured", { status: 500 });
  }

  // The raw body is required: svix verifies the signature over the exact
  // bytes Clerk sent, so parsing first and re-serialising would fail.
  const payload = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  let event: { type: string; data: ClerkUser };
  try {
    event = new Webhook(secret).verify(payload, headers) as typeof event;
  } catch {
    // Unverified means "not from Clerk". Say nothing about why.
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (event.type === "user.deleted") {
    // Soft delete: enrollments, attempts and certificates reference this row,
    // and a student's certificate must outlive their account.
    const { error } = await supabase
      .from("users")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("clerk_id", event.data.id);

    if (error) {
      console.error("[clerk-webhook] deactivate failed:", error.message);
      return new Response("Deactivate failed", { status: 500 });
    }
    return Response.json({ ok: true, action: "deactivated" });
  }

  if (event.type !== "user.created" && event.type !== "user.updated") {
    // Acknowledge everything else, or Clerk retries it forever.
    return Response.json({ ok: true, ignored: event.type });
  }

  const user = event.data;
  const email = emailOf(user);
  if (!email) {
    // users.email is NOT NULL. A Clerk account with no address at all cannot
    // be mirrored, and retrying will not produce one.
    console.error("[clerk-webhook] no email on", user.id);
    return Response.json({ ok: true, skipped: "no-email" });
  }

  const role = roleOf(user);

  // Upsert on clerk_id so Clerk can safely redeliver, and so user.updated
  // lands on the same row user.created made.
  const { data: row, error } = await supabase
    .from("users")
    .upsert(
      {
        clerk_id: user.id,
        email,
        full_name: nameOf(user),
        avatar_url: user.image_url,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clerk_id" },
    )
    .select("id")
    .single();

  if (error || !row) {
    console.error("[clerk-webhook] upsert failed:", error?.message);
    return new Response("Upsert failed", { status: 500 });
  }

  // An educator also needs the profile row that courses are attributed to.
  // Courses reference educator_profiles rather than users, so without this an
  // educator can sign in and still not be able to create anything.
  if (role === "educator") {
    const { error: profileError } = await supabase
      .from("educator_profiles")
      .upsert({ user_id: row.id }, { onConflict: "user_id" });

    if (profileError) {
      console.error("[clerk-webhook] profile upsert failed:", profileError.message);
      return new Response("Profile upsert failed", { status: 500 });
    }
  }

  return Response.json({ ok: true, action: event.type, role });
}
