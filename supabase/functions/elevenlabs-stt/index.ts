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

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    if (!audioFile) throw new Error("No audio file provided");

    const languageCode = (formData.get("language") as string) || undefined;

    const apiFormData = new FormData();
    apiFormData.append("file", audioFile);
    apiFormData.append("model_id", "scribe_v2");
    if (languageCode) {
      apiFormData.append("language_code", languageCode);
    }

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: apiFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs STT error:", response.status, errText);
      throw new Error(`STT failed: ${response.status}`);
    }

    const transcription = await response.json();

    return new Response(JSON.stringify({ text: transcription.text || "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("elevenlabs-stt error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
