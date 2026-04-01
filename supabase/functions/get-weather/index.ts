import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// NASA POWER API base
const POWER_API = 'https://power.larc.nasa.gov/api/temporal/daily/point';

// Format date as YYYYMMDD for NASA API
const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude = 28.6139, longitude = 77.2090 } = await req.json();

    // NASA POWER has ~3 day lag, so fetch wider range to get enough valid data
    const end = new Date();
    end.setDate(end.getDate() - 2); // skip last 2 days (often -999)
    const start = new Date(end);
    start.setDate(start.getDate() - 9); // get ~10 days to ensure 7 valid

    // NASA POWER parameters:
    // T2M = Temperature at 2m, T2M_MAX, T2M_MIN, RH2M = Relative Humidity,
    // WS10M = Wind Speed 10m, WS10M_MAX, PRECTOTCORR = Precipitation,
    // ALLSKY_SFC_UV_INDEX = UV Index, WD10M = Wind Direction
    const params = [
      'T2M', 'T2M_MAX', 'T2M_MIN', 'RH2M',
      'WS10M', 'WS10M_MAX', 'WD10M',
      'PRECTOTCORR', 'ALLSKY_SFC_UV_INDEX',
    ].join(',');

    const url = `${POWER_API}?parameters=${params}&community=AG&longitude=${longitude}&latitude=${latitude}&start=${fmt(start)}&end=${fmt(end)}&format=JSON`;

    console.log('NASA POWER URL:', url);

    const nasaRes = await fetch(url);
    if (!nasaRes.ok) {
      throw new Error(`NASA POWER API failed [${nasaRes.status}]`);
    }
    const nasa = await nasaRes.json();
    const props = nasa.properties?.parameter;

    if (!props) {
      throw new Error('Invalid response from NASA POWER API');
    }

    // Get all dates and filter out -999 (missing data)
    const allDates = Object.keys(props.T2M).sort();
    const validDates = allDates.filter(d => props.T2M[d] !== -999 && props.T2M_MAX[d] !== -999);
    if (validDates.length === 0) throw new Error('No valid data from NASA POWER for this period');
    
    // Take the latest 7 valid dates
    const recentDates = validDates.slice(-7);
    const latestDate = recentDates[recentDates.length - 1];

    // Current weather from the most recent day
    const currentTemp = props.T2M[latestDate];
    const currentHumidity = props.RH2M[latestDate];
    const currentWind = props.WS10M[latestDate];
    const currentWindDir = props.WD10M?.[latestDate] ?? 0;
    const currentUV = props.ALLSKY_SFC_UV_INDEX?.[latestDate] ?? 0;

    // Build condition string from available data
    const rain = props.PRECTOTCORR[latestDate];
    let condition = 'Clear sky';
    if (rain > 10) condition = 'Heavy rain';
    else if (rain > 5) condition = 'Moderate rain';
    else if (rain > 1) condition = 'Light rain';
    else if (rain > 0.1) condition = 'Light drizzle';
    else if (currentHumidity > 90) condition = 'Overcast';
    else if (currentHumidity > 70) condition = 'Partly cloudy';
    else if (currentHumidity > 50) condition = 'Mainly clear';

    const current = {
      temperature: round(currentTemp),
      feelsLike: round(currentTemp - (currentWind * 0.2)), // simple wind chill approx
      humidity: round(currentHumidity),
      windSpeed: round(currentWind * 3.6), // m/s → km/h
      windDirection: round(currentWindDir),
      uvIndex: round(currentUV, 1),
      condition,
    };

    // Forecast from daily data
    const forecast = recentDates.map((date, i) => {
      const y = date.slice(0, 4);
      const m = date.slice(4, 6);
      const d = date.slice(6, 8);
      const dateObj = new Date(`${y}-${m}-${d}`);
      return {
        date: `${y}-${m}-${d}`,
        day: i === recentDates.length - 1 ? 'Latest' : dateObj.toLocaleDateString('en', { weekday: 'short' }),
        tempMax: round(props.T2M_MAX[date]),
        tempMin: round(props.T2M_MIN[date]),
        rain: round(props.PRECTOTCORR[date], 1),
        weatherCode: rainToCode(props.PRECTOTCORR[date]),
        windMax: round((props.WS10M_MAX[date] ?? props.WS10M[date]) * 3.6),
      };
    });

    // Reverse so most recent is first
    forecast.reverse();

    // Generate alerts
    const alerts: { type: string; text: string }[] = [];
    forecast.forEach((day) => {
      if (day.rain > 50) {
        alerts.push({ type: 'warning', text: `Heavy rainfall on ${day.day} (${day.rain}mm). Protect exposed crops.` });
      } else if (day.rain > 20) {
        alerts.push({ type: 'info', text: `Moderate rain on ${day.day} (${day.rain}mm). Good for soil moisture.` });
      }
      if (day.tempMax > 40) {
        alerts.push({ type: 'warning', text: `Extreme heat on ${day.day} (${day.tempMax}°C). Increase irrigation.` });
      }
      if (day.windMax > 40) {
        alerts.push({ type: 'warning', text: `High winds on ${day.day} (${day.windMax} km/h). Secure crops.` });
      }
    });
    if (alerts.length === 0) {
      alerts.push({ type: 'success', text: 'Weather conditions are favorable. No major alerts.' });
    }

    const result = { current, forecast, alerts, location: { latitude, longitude }, source: 'NASA POWER (Satellite)' };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Weather fetch error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function round(n: number, decimals = 0) {
  if (n === -999 || n === undefined || n === null) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

function rainToCode(rain: number): number {
  if (rain > 20) return 65;
  if (rain > 5) return 63;
  if (rain > 1) return 61;
  if (rain > 0.1) return 51;
  return 0;
}
