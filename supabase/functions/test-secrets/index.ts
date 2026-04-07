import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secrets = [
    "LOVABLE_API_KEY",
    "OPENAI_API_KEY",
    "RESEND_API_KEY",
    "STRIPE_SECRET_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
  ];

  const results: Record<string, { configured: boolean; preview: string }> = {};

  for (const name of secrets) {
    const val = Deno.env.get(name);
    results[name] = {
      configured: !!val && val.length > 0,
      preview: val ? `${val.slice(0, 4)}...${val.slice(-4)}` : "(not set)",
    };
  }

  const allOk = Object.values(results).every((r) => r.configured);

  return new Response(
    JSON.stringify({ status: allOk ? "all_configured" : "missing_secrets", secrets: results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
