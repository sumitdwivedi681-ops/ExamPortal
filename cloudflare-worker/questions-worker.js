/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   ExamPortal — Cloudflare Worker                            ║
 * ║   Handles: GET /get-questions                               ║
 * ║   Cache: 10 minutes at Cloudflare Edge (150+ cities)        ║
 * ║   Capacity: 10 Million requests/day — FREE                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ── Your Render backend URL ──────────────────────────────────────
const RENDER_BACKEND = "https://examportal-backend-fakr.onrender.com";

// ── Cache TTL: 10 minutes ────────────────────────────────────────
const CACHE_TTL_SECONDS = 600;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── CORS headers (allow all origins) ───────────────────────
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ── Only handle GET /get-questions ──────────────────────────
    if (request.method !== "GET" || url.pathname !== "/get-questions") {
      return new Response(
        JSON.stringify({ error: "Only GET /get-questions is handled by this Worker" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const course = url.searchParams.get("course");
    if (!course) {
      return new Response(
        JSON.stringify({ error: "course parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Check Cloudflare Edge Cache ─────────────────────────────
    const cache = caches.default;
    const cacheKey = new Request(
      `${RENDER_BACKEND}/get-questions?course=${encodeURIComponent(course)}`,
      request
    );

    let cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      // Cache HIT — return instantly from nearest edge city
      const headers = new Headers(cachedResponse.headers);
      headers.set("X-Cache", "HIT");
      headers.set("X-Served-By", "Cloudflare-Worker");
      Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers,
      });
    }

    // ── Cache MISS — fetch from Render backend ──────────────────
    let backendResponse;
    try {
      backendResponse = await fetch(
        `${RENDER_BACKEND}/get-questions?course=${encodeURIComponent(course)}`,
        {
          cf: {
            // Cloudflare will also cache at network level
            cacheTtl: CACHE_TTL_SECONDS,
            cacheEverything: true,
          },
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Backend unreachable", detail: err.message }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!backendResponse.ok) {
      return new Response(backendResponse.body, {
        status: backendResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Store in Cloudflare Edge Cache for 10 minutes ───────────
    const responseToCache = new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
        "X-Cache": "MISS",
        "X-Served-By": "Cloudflare-Worker",
        ...corsHeaders,
      },
    });

    // Store in cache without blocking the response
    ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));

    return responseToCache;
  },
};
