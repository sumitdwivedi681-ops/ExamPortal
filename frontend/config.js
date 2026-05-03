// This is where your backend URL will go after hosting
// For now it stays localhost, but you can change it here later!
const API_URL = "http://localhost:5000";

// Export it for other files to use
if (typeof window !== "undefined") {
    window.API_URL = API_URL;
}
