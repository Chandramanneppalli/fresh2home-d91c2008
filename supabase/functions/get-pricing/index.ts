import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { crops = ['Tomatoes', 'Rice', 'Spinach', 'Mangoes', 'Potatoes'], region = 'India' } = await req.json();

    const today = new Date().toISOString().split('T')[0];

    const prompt = `You are a senior agricultural market analyst with deep expertise in global commodity markets. Provide comprehensive, realistic market pricing data for these crops in ${region} as of ${today}.

Crops to analyze: ${crops.join(', ')}

IMPORTANT — Your analysis MUST incorporate ALL of the following factors:

1. **Global Market Trends**: International commodity prices, import/export dynamics, trade policies, tariffs, sanctions, and currency fluctuations (INR vs USD) that affect crop prices.

2. **Geopolitical & Economic Situations**: Ongoing conflicts, supply chain disruptions, fuel/fertilizer cost changes, government subsidies (MSP — Minimum Support Price), procurement policies, and inflation.

3. **Market Demand**: Festival/seasonal demand spikes (e.g., Navratri, Diwali, Ramadan), urban vs rural consumption patterns, restaurant/food industry demand, and export demand from international buyers.

4. **Weather & Climate Conditions**: Current monsoon status, El Niño/La Niña effects, drought/flood risks, unseasonal rainfall, heatwaves, and their direct impact on yield and supply for each crop. Consider both the current season and upcoming weather forecasts.

5. **Supply Chain Factors**: Cold storage availability, transportation costs, wastage rates, mandi (wholesale market) dynamics, and middlemen impact on pricing.

6. **Historical Patterns**: Year-over-year price trends, cyclical patterns, and any anomalies in the current season.

Return a JSON object with this exact structure (no markdown, no explanation, just pure JSON):
{
  "priceHistory": [
    { "month": "Oct", ${crops.map(c => `"${c.toLowerCase()}": <price_inr_per_kg>`).join(', ')} },
    ... (6 months of historical data leading up to current month)
  ],
  "predictions": [
    {
      "product": "<crop_name>",
      "currentPrice": <current_price_inr>,
      "predictedPrice": <predicted_price_next_week>,
      "trend": "up" or "down" or "stable",
      "confidence": <0.0 to 1.0>,
      "reason": "<detailed reason incorporating weather, demand, global factors>"
    }
  ],
  "marketInsights": [
    "<insight about global market impact on local prices>",
    "<insight about weather/climate effects on upcoming supply>",
    "<insight about demand trends and seasonal patterns>",
    "<insight about government policy or trade impact>"
  ]
}

Use realistic Indian market prices in INR per kg. Every prediction reason should reference at least 2 of the factors listed above.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI gateway failed [${aiResponse.status}]: ${await aiResponse.text()}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from AI response (handle potential markdown wrapping)
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch?.[0] || content);
    } catch {
      throw new Error('Failed to parse AI pricing response');
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Pricing error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
