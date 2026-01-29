import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

function getEnv(name: string): string | undefined {
  return Deno.env.get(name) ?? undefined;
}

function getServiceRoleKey(): string {
  return (
    getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    getEnv("SUPABASE_SERVICE_KEY") ||
    getEnv("SUPABASE_SERVICE_ROLE") ||
    ""
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const expectedToken = getEnv("ADMIN_TOKEN");
  const auth = req.headers.get("authorization") || "";
  if (!expectedToken || auth !== `Bearer ${expectedToken}`) {
    return jsonResponse({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = getEnv("SUPABASE_URL") || "";
  const serviceRoleKey = getServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ success: false, error: "Server misconfigured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const action = segments[segments.length - 1] || "";

  try {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, { status: 405 });
    }

    if (action === "pending") {
      const { data, error } = await supabase.from("pending_submissions").select("*");
      if (error) return jsonResponse({ success: false, error: error.message }, { status: 500 });
      return jsonResponse({ success: true, data: data ?? [] });
    }

    if (action === "stats") {
      const { data, error } = await supabase.rpc("get_submission_stats");
      if (error) return jsonResponse({ success: false, error: error.message }, { status: 500 });
      // Supabase RPC returns an array for TABLE-returning functions
      return jsonResponse({ success: true, data: (data && data[0]) ? data[0] : {} });
    }

    if (action === "leaderboard") {
      const { data, error } = await supabase.from("referral_leaderboard").select("*");
      if (error) return jsonResponse({ success: false, error: error.message }, { status: 500 });
      return jsonResponse({ success: true, data: data ?? [] });
    }

    return jsonResponse({ success: false, error: "Not found" }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ success: false, error: "Internal server error", message }, { status: 500 });
  }
});
