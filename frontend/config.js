// LIVE BACKEND URL ON RENDER
const API_URL = "https://examportal-backend-fakr.onrender.com";

// Export it for other files to use
if (typeof window !== "undefined") {
    window.API_URL = API_URL;
}
