import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data, error } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (error || !data?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY is not configured");

    const AGENT_ID = "gMRjEAcWCvjoyqIfZqlp";

    const apiBases = [
      "https://api.elevenlabs.io",
      "https://api.us.elevenlabs.io",
      "https://api.eu.residency.elevenlabs.io",
    ];

    let response: Response | null = null;
    let lastError = "Unknown ElevenLabs error";

    for (const baseUrl of apiBases) {
      response = await fetch(
        `${baseUrl}/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`,
        { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
      );
      if (response.ok) break;
      const errText = await response.text();
      lastError = `${baseUrl} [${response.status}] ${errText}`;
      console.error("ElevenLabs token error:", lastError);
      response = null;
    }

    if (!response) throw new Error(`Failed to get signed URL: ${lastError}`);

    const { signed_url } = await response.json();

    return new Response(JSON.stringify({ signed_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("elevenlabs-conversation-token error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
