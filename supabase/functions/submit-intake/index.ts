import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type Submission = {
  submission_id: string;
  timestamp: string;
  name: string;
  email: string;
  jurisdiction: string;
  role: string;
  metal: string;
  unit: string;
  proposed_weight: number;
  referral_id: string;
  referred_by?: string;
  organization?: string;
  wallet?: string;
  intended_use?: string;
  status?: string;
};

function getEnv(name: string): string | undefined {
  return Deno.env.get(name) ?? undefined;
}

function requireEnv(name: string): string {
  const value = getEnv(name);
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function getServiceRoleKey(): string {
  return (
    getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    getEnv("SUPABASE_SERVICE_KEY") ||
    getEnv("SUPABASE_SERVICE_ROLE") ||
    ""
  );
}

function validateSubmission(body: unknown): { ok: true; data: Submission } | { ok: false; error: string; missing?: string[] } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON body" };
  }

  const data = body as Record<string, unknown>;
  const required = [
    "submission_id",
    "timestamp",
    "name",
    "email",
    "jurisdiction",
    "role",
    "metal",
    "unit",
    "proposed_weight",
    "referral_id",
  ];

  const missing = required.filter((key) => {
    const value = data[key];
    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    return { ok: false, error: "Missing required fields", missing };
  }

  const proposedWeight = Number(data.proposed_weight);
  if (!Number.isFinite(proposedWeight) || proposedWeight <= 0) {
    return { ok: false, error: "Invalid proposed_weight" };
  }

  return {
    ok: true,
    data: {
      submission_id: String(data.submission_id),
      timestamp: String(data.timestamp),
      name: String(data.name),
      email: String(data.email),
      jurisdiction: String(data.jurisdiction),
      role: String(data.role),
      metal: String(data.metal),
      unit: String(data.unit),
      proposed_weight: proposedWeight,
      referral_id: String(data.referral_id),
      referred_by: data.referred_by ? String(data.referred_by) : undefined,
      organization: data.organization ? String(data.organization) : undefined,
      wallet: data.wallet ? String(data.wallet) : undefined,
      intended_use: data.intended_use ? String(data.intended_use) : undefined,
      status: data.status ? String(data.status) : "PENDING",
    },
  };
}

async function sendSendGridEmail(payload: unknown): Promise<void> {
  const apiKey = getEnv("SENDGRID_API_KEY");
  if (!apiKey) return;

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`SendGrid error: ${response.status} ${text}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const validated = validateSubmission(body);
    if (!validated.ok) {
      return jsonResponse({ success: false, error: validated.error, missing: validated.missing }, { status: 400 });
    }

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = getServiceRoleKey();
    if (!serviceRoleKey) {
      return jsonResponse(
        { success: false, error: "Server misconfigured", message: "Missing Supabase service role key" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const insertPayload = validated.data;
    const { error: insertError } = await supabase.from("submissions").insert(insertPayload);
    if (insertError) {
      return jsonResponse({ success: false, error: "Database insert failed", details: insertError.message }, { status: 400 });
    }

    const fromEmail = getEnv("FROM_EMAIL") || "genesis@unykorn.org";
    const internalRecipientsRaw = getEnv("INTERNAL_RECIPIENTS") || "";
    const internalRecipients = internalRecipientsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const submissionShort = insertPayload.submission_id.slice(0, 16);
    const registrantText = [
      "K IMPERIA — Genesis Registration Received",
      "",
      "This confirms receipt of your non-binding, weight-referenced allocation signal.",
      "",
      `Submission ID: ${submissionShort}...`,
      `Metal: ${insertPayload.metal}`,
      `Proposed Weight: ${insertPayload.proposed_weight} ${insertPayload.unit}`,
      `Jurisdiction: ${insertPayload.jurisdiction}`,
      `Referral ID: ${insertPayload.referral_id}`,
      insertPayload.referred_by ? `Referred By: ${insertPayload.referred_by}` : "Referred By: (direct)",
      "",
      "Important: This is not an offer, not a purchase agreement, and does not guarantee eligibility, allocation, or issuance.",
    ].join("\n");

    const internalText = [
      "K IMPERIA — New Genesis Registration",
      "",
      `Name: ${insertPayload.name}`,
      `Email: ${insertPayload.email}`,
      `Role: ${insertPayload.role}`,
      `Metal: ${insertPayload.metal}`,
      `Proposed Weight: ${insertPayload.proposed_weight} ${insertPayload.unit}`,
      `Jurisdiction: ${insertPayload.jurisdiction}`,
      `Submission ID: ${insertPayload.submission_id}`,
      `Referral ID: ${insertPayload.referral_id}`,
      insertPayload.referred_by ? `Referred By: ${insertPayload.referred_by}` : "Referred By: (direct)",
      "",
      "Note: Registration is non-binding. Do not treat as commitment.",
    ].join("\n");

    // Send registrant email (best effort)
    let registrantEmailSent = false;
    try {
      await sendSendGridEmail({
        personalizations: [{ to: [{ email: insertPayload.email }] }],
        from: { email: fromEmail },
        subject: "K IMPERIA — Genesis Registration Received",
        content: [{ type: "text/plain", value: registrantText }],
      });
      registrantEmailSent = true;
    } catch {
      registrantEmailSent = false;
    }

    // Send internal notification (best effort)
    let internalEmailSent = false;
    if (internalRecipients.length > 0) {
      try {
        await sendSendGridEmail({
          personalizations: [{ to: internalRecipients.map((email) => ({ email })) }],
          from: { email: fromEmail },
          subject: "K IMPERIA — New Genesis Registration",
          content: [{ type: "text/plain", value: internalText }],
        });
        internalEmailSent = true;
      } catch {
        internalEmailSent = false;
      }
    }

    // Update email flags (best effort)
    try {
      await supabase
        .from("submissions")
        .update({
          email_sent: registrantEmailSent,
          email_sent_at: registrantEmailSent ? new Date().toISOString() : null,
          internal_notification_sent: internalEmailSent,
        })
        .eq("submission_id", insertPayload.submission_id);
    } catch {
      // ignore
    }

    return jsonResponse({
      success: true,
      data: {
        submission_id: insertPayload.submission_id,
        referral_id: insertPayload.referral_id,
        email_sent: registrantEmailSent,
        internal_notification_sent: internalEmailSent,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ success: false, error: "Internal server error", message }, { status: 500 });
  }
});
