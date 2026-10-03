// ── Main backend (Render) — login, register, results, admin ──────
const API_URL = "https://examportal-backend-fakr.onrender.com";

// ── Cloudflare Worker — GET /get-questions (10M req/day FREE) ────
// ⚠️  Deploy karne ke baad yahan apna Worker URL daalo
// Format: https://examportal-questions.<your-subdomain>.workers.dev
// Jab tak deploy nahi hota, Render backend use hoga automatically
const QUESTIONS_WORKER_URL = "https://examportal.sumitdwivedi681.workers.dev";

const GOOGLE_CLIENT_ID = "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE";

// Export for all frontend files
if (typeof window !== "undefined") {
    window.API_URL          = API_URL;
    window.GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;

    // Smart routing: Worker available? → use it. Warna Render fallback.
    window.QUESTIONS_URL = QUESTIONS_WORKER_URL
        ? QUESTIONS_WORKER_URL
        : API_URL;
}
