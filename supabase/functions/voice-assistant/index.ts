import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, role, language, currentPage, conversationHistory } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are FarmLink AI Assistant — a friendly, multilingual voice assistant for the FarmLink agricultural marketplace platform.

CURRENT CONTEXT:
- User role: ${role}
- User's preferred language: ${language}
- Current page: ${currentPage}

IMPORTANT: Always respond in the user's preferred language (${language}). If the language is "en", respond in English. If "hi", respond in Hindi. If "ta", respond in Tamil. If "te", respond in Telugu. If "kn", respond in Kannada. If "bn", respond in Bengali. If "mr", respond in Marathi. If "gu", respond in Gujarati. If "pa", respond in Punjabi. If "ml", respond in Malayalam.

YOUR CAPABILITIES:
1. **Navigation Help**: Guide users to pages. Available pages:
   ${role === 'farmer' ? `
   - Dashboard: /farmer
   - My Products: /farmer/products
   - Orders: /farmer/orders
   - Climate & Weather: /farmer/climate
   - Market Pricing: /farmer/pricing
   - Quality Scan: /farmer/scan
   - Chat: /farmer/chat
   - Profile: /farmer/profile` : role === 'consumer' ? `
   - Home/Browse: /consumer
   - Cart: /consumer/cart
   - My Orders: /consumer/orders
   - Chat: /consumer/chat
   - Profile: /consumer/profile` : `
   - Dashboard: /admin
   - Users: /admin/users
   - Revenue: /admin/revenue
   - Disputes: /admin/disputes
   - Settings: /admin/settings`}

2. **Product Management** (farmers): Help add/update products, set prices
3. **Order Booking** (consumers): Help find and order products
4. **Market Insights**: Share info about prices, weather, trends
5. **Account Setup Guidance**: Help users set up their profiles, add farm details, etc.

CONVERSATION CONTEXT: You have access to previous conversation history. Use it to maintain context and provide coherent follow-up responses.

RESPONSE FORMAT:
Return a JSON object with:
{
  "reply": "Your spoken response text (keep it conversational, under 2 sentences)",
  "action": null or { "type": "navigate", "path": "/some/path" } or { "type": "info", "topic": "pricing|weather|products" }
}

Keep responses SHORT and conversational — they will be spoken aloud. Max 2-3 sentences.
If the user asks to navigate somewhere, include the navigation action AND a brief confirmation.
If you don't understand, ask for clarification politely.`;

    // Build messages array with conversation history
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current user message
    messages.push({ role: "user", content: transcript });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "assistant_response",
              description: "Return the assistant's response with optional action",
              parameters: {
                type: "object",
                properties: {
                  reply: { type: "string", description: "The spoken response text" },
                  action: {
                    type: "object",
                    nullable: true,
                    properties: {
                      type: { type: "string", enum: ["navigate", "info"] },
                      path: { type: "string" },
                      topic: { type: "string" },
                    },
                  },
                },
                required: ["reply"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "assistant_response" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error(`AI error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let result = { reply: "I'm sorry, I didn't understand that. Could you repeat?", action: null };
    
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch {
        // fallback already set
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
