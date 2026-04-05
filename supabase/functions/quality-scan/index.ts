import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, productName, category } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Image is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an agricultural produce quality assessment AI. Analyze the provided image of produce/crops and return a quality assessment.

You MUST call the assess_quality function with your analysis. Be strict but fair:
- Freshness: visible wilting, browning, moisture loss
- Color Uniformity: consistent coloring across the produce
- Size Consistency: uniform sizing of items
- Surface Quality: blemishes, bruises, pest damage, cracks

Grade scale:
- A+ (90-100 avg): Premium, market ready
- A (75-89 avg): Good quality, acceptable
- B+ (60-74 avg): Below standard, needs improvement
- Reject (<60 avg): Does not meet quality standards

If the image is NOT of produce/crops/food items, set all scores to 0 and grade to "Reject" with reason "Image does not appear to be agricultural produce."`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Analyze this ${category || "produce"} image${productName ? ` (labeled as "${productName}")` : ""}. Assess its quality metrics.` },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "assess_quality",
              description: "Return structured quality assessment results for the produce image",
              parameters: {
                type: "object",
                properties: {
                  freshness: { type: "number", description: "Freshness score 0-100" },
                  color_uniformity: { type: "number", description: "Color uniformity score 0-100" },
                  size_consistency: { type: "number", description: "Size consistency score 0-100" },
                  surface_quality: { type: "number", description: "Surface quality score 0-100" },
                  overall_grade: { type: "string", enum: ["A+", "A", "B+", "Reject"] },
                  summary: { type: "string", description: "Brief quality summary in 1-2 sentences" },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of improvement recommendations if any",
                  },
                },
                required: ["freshness", "color_uniformity", "size_consistency", "surface_quality", "overall_grade", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "assess_quality" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return quality assessment");
    }

    const metrics = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ metrics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quality-scan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
