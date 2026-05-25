import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vahxyslxfdpmroznukad.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaHh5c2x4ZmRwbXJvem51a2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTMyMDQsImV4cCI6MjA5NTI2OTIwNH0.2mwsOrDrSQFwMiewHRGLL43TDGBWOO7aJUktDe9eB-w";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("historical_risk_zones")
      .select("*");

    if (error) {
      console.warn("Supabase fetch failed or table doesn't exist, falling back to mock data. Error:", error.message);
      throw error;
    }

    // If the table exists but is empty, use mock data so the map shows points
    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        data: getFallbackData(),
        isFallback: true
      });
    }

    return NextResponse.json({
      success: true,
      data: data
    });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      data: getFallbackData(),
      isFallback: true,
      error: error.message || "Table not found"
    });
  }
}

function getFallbackData() {
  return [
    {
      id: "fb-1",
      Location: "Mount Erebus, Antarctica",
      Latitude: -77.53,
      Longitude: 167.17,
      Reason: "Controlled Flight Into Terrain (CFIT). Air New Zealand Flight 901 collided with Mount Erebus in 1979 due to coordinate changes and whiteout conditions."
    },
    {
      id: "fb-2",
      Location: "Near Cali, Colombia",
      Latitude: 3.8372,
      Longitude: -76.3217,
      Reason: "Controlled Flight Into Terrain (CFIT). American Airlines Flight 965 struck a mountain near Buga in 1995 after pilot navigation entry errors in a mountainous region."
    },
    {
      id: "fb-3",
      Location: "Superstition Mountains, Arizona, USA",
      Latitude: 33.4294,
      Longitude: -111.4286,
      Reason: "Controlled Flight Into Terrain (CFIT). Multiple general aviation crashes due to rugged peaks, microburst turbulence, and low altitude night transitions."
    },
    {
      id: "fb-4",
      Location: "Mount Salak, Indonesia",
      Latitude: -6.7167,
      Longitude: 106.7333,
      Reason: "Controlled Flight Into Terrain (CFIT). Sukhoi Superjet 100 crashed into a vertical cliff in 2012 due to crew distraction and terrain warning system override."
    },
    {
      id: "fb-5",
      Location: "Mount Göztepe, Turkey",
      Latitude: 39.8136,
      Longitude: 41.5053,
      Reason: "Controlled Flight Into Terrain (CFIT). Multiple military and transport aircraft collisions due to heavy snow fog and ridge elevation navigation errors."
    }
  ];
}
