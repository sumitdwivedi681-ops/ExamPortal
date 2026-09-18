// LIVE BACKEND URL ON RENDER
const API_URL = "https://examportal-backend-fakr.onrender.com";
const GOOGLE_CLIENT_ID = "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE";

// Export it for other files to use
if (typeof window !== "undefined") {
    window.API_URL = API_URL;
    window.GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;
}
