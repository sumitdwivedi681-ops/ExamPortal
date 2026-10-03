/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   SAARTHI (सारथी) — AI Assistant Client Widget               ║
 * ║   Interactive, Multi-lingual, Auto-attached to Portal        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

(function initSaarthiWidget() {
    let lastSuggestedCourse = "";
    let isWaitingForResponse = false;

    // Helper: format markdown safely to HTML
    function formatMessageText(text) {
        if (!text) return "";
        let escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Bold **text**
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // Clickable Markdown Links [label](url)
        escaped = escaped.replace(/\[(.*?)\]\((https?:\/\/.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        // Bullet points
        escaped = escaped.replace(/^[•\-\*]\s+(.*)$/gm, '<li style="margin-left: 14px;">$1</li>');

        // Line breaks
        escaped = escaped.replace(/\n/g, "<br>");

        return escaped;
    }

    // Create & Inject HTML into DOM
    function injectWidgetHTML() {
        if (document.getElementById("saarthi-container")) return;

        const container = document.createElement("div");
        container.id = "saarthi-container";
        container.innerHTML = `
            <!-- Floating Assistant Button -->
            <div class="saarthi-fab" id="saarthi-fab" title="Ask Saarthi AI">
                <i class="fas fa-comment-dots"></i>
                <div class="saarthi-badge-pulse"></div>
                <div class="saarthi-fab-tooltip">Ask Saarthi AI 🤖</div>
            </div>

            <!-- Chat Window -->
            <div class="saarthi-chat-window" id="saarthi-chat-window">
                <!-- Header -->
                <div class="saarthi-header">
                    <div class="saarthi-header-brand">
                        <div class="saarthi-avatar-box">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div>
                            <h6 class="saarthi-header-title">Saarthi <span style="font-size: 0.8rem; font-weight: normal; opacity: 0.8;">(सारथी)</span></h6>
                            <p class="saarthi-status"><span class="saarthi-status-dot"></span> AI Academic Guide</p>
                        </div>
                    </div>
                    <button class="saarthi-close-btn" id="saarthi-close-btn" aria-label="Close Chat">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Messages Body -->
                <div class="saarthi-messages" id="saarthi-messages">
                    <!-- Initial Welcome Message -->
                    <div class="saarthi-msg saarthi-msg-bot">
                        नमस्ते! 🙏 Main <strong>Saarthi</strong> hoon — Elite Exam Portal ka aapka personal AI Academic Guide. 📚<br><br>
                        Main aapki padhai, practice tests dene aur sabhi computer science subjects ko samajhne me madad karunga. Aap world ki kisi bhi bhasha (Hindi, English, Hinglish, Spanish, French, Bengali, etc.) me sawaal puch sakte hain!
                        
                        <div class="saarthi-chips mt-3">
                            <button class="saarthi-chip" onclick="window.sendSaarthiQuick('Website kaise use karein?')">🚀 Website Guide</button>
                            <button class="saarthi-chip" onclick="window.sendSaarthiQuick('Available subjects ke baare me batao')">📚 All Subjects</button>
                            <button class="saarthi-chip" onclick="window.sendSaarthiQuick('DSA ke baare me batao')">💻 Learn DSA</button>
                            <button class="saarthi-chip" onclick="window.sendSaarthiQuick('DevOps subject chahiye')">💡 Request Subject</button>
                        </div>
                    </div>
                </div>

                <!-- Input Footer -->
                <form class="saarthi-input-bar" id="saarthi-form">
                    <input type="text" id="saarthi-input" class="saarthi-input" placeholder="Type your question in any language..." autocomplete="off" required>
                    <button type="submit" class="saarthi-send-btn" id="saarthi-send-btn" aria-label="Send">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </form>
            </div>
        `;

        document.body.appendChild(container);
        setupEventListeners();
    }

    // Event listeners for open, close, submit
    function setupEventListeners() {
        const fab = document.getElementById("saarthi-fab");
        const chatWindow = document.getElementById("saarthi-chat-window");
        const closeBtn = document.getElementById("saarthi-close-btn");
        const form = document.getElementById("saarthi-form");
        const input = document.getElementById("saarthi-input");

        if (fab && chatWindow) {
            fab.addEventListener("click", () => {
                chatWindow.classList.toggle("open");
                if (chatWindow.classList.contains("open")) {
                    setTimeout(() => input && input.focus(), 300);
                }
            });
        }

        if (closeBtn && chatWindow) {
            closeBtn.addEventListener("click", () => {
                chatWindow.classList.remove("open");
            });
        }

        if (form) {
            form.addEventListener("submit", (e) => {
                e.preventDefault();
                const msg = input.value.trim();
                if (!msg || isWaitingForResponse) return;
                sendMessage(msg);
                input.value = "";
            });
        }
    }

    // Send Quick Prompt from Chips
    window.sendSaarthiQuick = function(promptText) {
        sendMessage(promptText);
    };

    // Append Message to UI
    function appendMessage(sender, htmlContent) {
        const messagesBox = document.getElementById("saarthi-messages");
        if (!messagesBox) return;

        const msgDiv = document.createElement("div");
        msgDiv.className = `saarthi-msg ${sender === 'user' ? 'saarthi-msg-user' : 'saarthi-msg-bot'}`;
        msgDiv.innerHTML = htmlContent;

        messagesBox.appendChild(msgDiv);
        messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    // Show / Hide Typing Indicator
    function showTypingIndicator() {
        const messagesBox = document.getElementById("saarthi-messages");
        if (!messagesBox) return;

        const typingDiv = document.createElement("div");
        typingDiv.className = "saarthi-typing";
        typingDiv.id = "saarthi-typing-indicator";
        typingDiv.innerHTML = `<span></span><span></span><span></span>`;
        messagesBox.appendChild(typingDiv);
        messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    function removeTypingIndicator() {
        const el = document.getElementById("saarthi-typing-indicator");
        if (el) el.remove();
    }

    // Core Send Message function to backend
    async function sendMessage(userText) {
        // 1. Display user message
        appendMessage("user", formatMessageText(userText));

        // 2. Prepare payload with user state
        let student = null;
        try {
            student = JSON.parse(localStorage.getItem("loggedUser"));
        } catch (e) {}

        const userEmail = student ? student.email : "Guest Student";
        const userName = student ? student.full_name : "Guest";

        isWaitingForResponse = true;
        const sendBtn = document.getElementById("saarthi-send-btn");
        if (sendBtn) sendBtn.disabled = true;

        showTypingIndicator();

        try {
            const apiUrl = window.API_URL || "https://examportal-backend-fakr.onrender.com";
            const res = await fetch(`${apiUrl}/api/saarthi/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userText,
                    user_email: userEmail,
                    user_name: userName,
                    lastSuggestedCourse: lastSuggestedCourse
                })
            });

            const data = await res.json();
            removeTypingIndicator();

            if (data.status === "success" && data.reply) {
                lastSuggestedCourse = data.lastSuggestedCourse || "";
                
                let botReplyHtml = formatMessageText(data.reply);
                
                // If course was requested, add quick action buttons
                if (data.topic === "course_request" && data.courseRequested && !data.feedbackApproved) {
                    botReplyHtml += `
                        <div class="saarthi-chips mt-3">
                            <button class="saarthi-chip" onclick="window.sendSaarthiQuick('Haan, Sumit ji ko bhej do')">👍 Haan, Bhej do</button>
                            <button class="saarthi-chip" onclick="window.sendSaarthiQuick('Nahi, koi baat nahi')">👎 Nahi, Rehne do</button>
                        </div>
                    `;
                }

                appendMessage("bot", botReplyHtml);
            } else {
                appendMessage("bot", "Maaf kijiye, abhi server se connect nahi ho pa raha hai. Kripya thodi der baad dubara puchein!");
            }
        } catch (err) {
            console.error("Saarthi Client Error:", err);
            removeTypingIndicator();
            appendMessage("bot", "Maaf kijiye, network error ki wajah se reply nahi mil paya. Thodi der baad dubara koshish karein!");
        } finally {
            isWaitingForResponse = false;
            if (sendBtn) sendBtn.disabled = false;
        }
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectWidgetHTML);
    } else {
        injectWidgetHTML();
    }
})();
