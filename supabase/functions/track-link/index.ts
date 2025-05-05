import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

// Cache for rate limiting
const clickCache = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute

serve(async (req) => {
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const params = url.searchParams;
    const originalUrl = params.get("url");
    const emailId = params.get("emailId");
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";

    if (!originalUrl || !emailId) {
      return new Response("URL and email ID required", { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Rate limiting check
    const cacheKey = `${emailId}:${originalUrl}:${clientIp}`;
    const lastClick = clickCache.get(cacheKey);
    const now = Date.now();

    if (lastClick && (now - lastClick) < RATE_LIMIT_WINDOW) {
      console.log(`[track-link] Rate limited: ${cacheKey}`);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          "Location": originalUrl,
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });
    }

    // Update rate limit cache
    clickCache.set(cacheKey, now);

    // Clean up old cache entries
    for (const [key, timestamp] of clickCache.entries()) {
      if (now - timestamp > RATE_LIMIT_WINDOW) {
        clickCache.delete(key);
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Check if email exists before processing
    const { data: email } = await supabase
      .from("emails")
      .select("id")
      .eq("id", emailId)
      .single();

    if (!email) {
      console.log(`[track-link] Email not found: ${emailId}`);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          "Location": originalUrl,
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });
    }

    // Call stored procedure to record click
    await supabase.rpc('record_link_click', {
      p_email_id: emailId,
      p_original_url: originalUrl,
      p_ip_address: clientIp,
      p_user_agent: req.headers.get("user-agent") || "unknown"
    });

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": originalUrl,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (error) {
    console.error("[track-link] Error:", error);
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": originalUrl || "/",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  }
});