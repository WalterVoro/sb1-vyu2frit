import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

// Cache for rate limiting
const openCache = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute

serve(async (req) => {
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const emailId = url.pathname.split("/").pop();
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    
    if (!emailId) {
      return new Response("Email ID required", { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Rate limiting check
    const cacheKey = `${emailId}:${clientIp}`;
    const lastOpen = openCache.get(cacheKey);
    const now = Date.now();

    if (lastOpen && (now - lastOpen) < RATE_LIMIT_WINDOW) {
      console.log(`[track-pixel] Rate limited: ${cacheKey}`);
      // Return pixel without processing
      return new Response(getPixel(), {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/gif",
          "Content-Length": "42",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });
    }

    // Update rate limit cache
    openCache.set(cacheKey, now);

    // Clean up old cache entries
    for (const [key, timestamp] of openCache.entries()) {
      if (now - timestamp > RATE_LIMIT_WINDOW) {
        openCache.delete(key);
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
      console.log(`[track-pixel] Email not found: ${emailId}`);
      return new Response(getPixel(), {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/gif",
          "Content-Length": "42",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });
    }

    // Call stored procedure to record open
    await supabase.rpc('record_email_open', {
      p_email_id: emailId,
      p_ip_address: clientIp,
      p_user_agent: req.headers.get("user-agent") || "unknown"
    });

    return new Response(getPixel(), {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/gif",
        "Content-Length": "42",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (error) {
    console.error("[track-pixel] Error:", error);
    return new Response(getPixel(), {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/gif",
        "Content-Length": "42",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  }
});

function getPixel() {
  return new Uint8Array([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
    0x00, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00,
    0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
    0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
  ]);
}