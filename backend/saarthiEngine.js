/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   SAARTHI (सारथी) — AI Academic Assistant Engine             ║
 * ║   Multi-lingual, Context-Aware, Knowledge & Feedback Agent   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const LearnedKnowledge = require("./config/LearnedKnowledge");

const CREATOR_INFO = {
  name: "Sumit Dwivedi",
  title: "MCA Student & Full Stack Web Developer",
  role: "Creator & Architect of Elite Exam Portal",
  bio: "Sumit Dwivedi is an MCA student and full-stack software developer who designed and engineered this Exam Portal to empower students with free, real-time practice tests and instant performance analytics.",
  github: "https://github.com/sumitdwivedi681-ops",
  linkedin: "https://www.linkedin.com/in/sumit-dwivedi-76965b386/",
  instagram: "https://www.instagram.com/mr_suumit/",
  instagram_handle: "@mr_suumit",
  email: "sumitdwivedi681@gmail.com"
};

// In-memory knowledge store (populated from DB and live user teaching)
let knowledgeMemory = [];

// Initialize learned knowledge from MongoDB Atlas
(async function loadLearnedKnowledge() {
  try {
    const list = await LearnedKnowledge.find({ verified: true }).sort({ createdAt: -1 }).limit(200).lean();
    knowledgeMemory = list.map(item => ({
      topic: item.topic.toLowerCase(),
      fact: item.fact
    }));
  } catch (err) {
    // Database will be queried on demand if needed
  }
})();

// Comprehensive Profanity / Abuse Filter (Hinglish, Hindi, English)
const PROFANITY_PATTERNS = [
  /\b(mc|bc|bsdk|bhosdike|bhosadi|chutiya|chutiye|chutya|madarchod|madarchodh|bhenchod|behenchod|gandu|gaandu)\b/i,
  /\b(lund|lauda|laude|loda|lavde|randi|rndi|harami|haramkhor|kamine|suar|kutte|pel|gaand|gand|tatte|jhaat)\b/i,
  /\b(fuck|fucker|fucking|bitch|bastard|asshole|dick|pussy|cunt|motherfucker|whore|slut|stfu)\b/i,
  /\b(maa ki|behen ki|teri maa|teri behen)\b/i
];

function checkProfanity(text) {
  if (!text) return false;
  return PROFANITY_PATTERNS.some(pattern => pattern.test(text));
}

// Available Subjects with Curated Syllabus & Concepts
const AVAILABLE_SUBJECTS = {
  "dsa": {
    name: "Data Structures & Algorithms (DSA)",
    desc: "Arrays, Linked Lists, Stacks, Queues, Trees, Binary Search Trees, Graphs, Sorting (Merge/Quick), Searching, Dynamic Programming, and Time-Complexity.",
    keywords: ["dsa", "data structure", "algorithm", "tree", "graph", "stack", "queue", "array", "linked list", "recursion", "dynamic programming"]
  },
  "os": {
    name: "Operating System (OS)",
    desc: "Process Management, CPU Scheduling (FCFS, Round Robin, SJF), Threads, Deadlocks (Banker's Algorithm), Memory Management, Paging, Virtual Memory, and File Systems.",
    keywords: ["os", "operating system", "process", "thread", "deadlock", "scheduling", "paging", "virtual memory", "semaphores"]
  },
  "dbms": {
    name: "Database Management System (DBMS)",
    desc: "Relational Models, SQL Queries, Normalization (1NF to BCNF), ACID Properties, Transactions, Indexing, and ER Diagrams.",
    keywords: ["dbms", "database", "sql", "normalization", "acid", "relational", "mongo", "table", "transaction"]
  },
  "cn": {
    name: "Computer Networks (CN)",
    desc: "OSI Model 7 layers, TCP/IP, IP Addressing (IPv4/IPv6), Routing Protocols, Subnetting, Switching, DNS, HTTP/HTTPS, and Network Security.",
    keywords: ["cn", "computer network", "networking", "osi", "tcp", "udp", "ip", "router", "switch", "subnet", "dns"]
  },
  "se": {
    name: "Software Engineering",
    desc: "SDLC Models (Agile, Waterfall, Spiral), Requirement Engineering, UML Diagrams, Software Testing (Black/White box), and Maintenance.",
    keywords: ["software engineering", "sdlc", "agile", "waterfall", "uml", "testing", "scrum", "qa"]
  },
  "cloud": {
    name: "Cloud Computing",
    desc: "IaaS, PaaS, SaaS, AWS, Azure, Virtualization, Cloud Architecture, Deployment Models, and Serverless computing.",
    keywords: ["cloud", "aws", "azure", "cloud computing", "saas", "paas", "iaas", "virtualization", "serverless"]
  },
  "cyber": {
    name: "Cyber Security",
    desc: "Network Security, Ethical Hacking, Cryptography (RSA, AES), Firewalls, Malware, Phishing, Penetration Testing, and Cyber Defense.",
    keywords: ["cyber", "cyber security", "hacking", "ethical hacking", "cryptography", "firewall", "security", "encryption"]
  },
  "ai": {
    name: "Artificial Intelligence (AI)",
    desc: "Search Algorithms (A*, Heuristics, BFS, DFS), Knowledge Representation, Expert Systems, Game Playing (Minimax), NLP, and Logic.",
    keywords: ["ai", "artificial intelligence", "intelligent", "expert system", "nlp", "heuristic", "minimax", "search algorithm"]
  },
  "ml": {
    name: "Machine Learning (ML)",
    desc: "Supervised & Unsupervised Learning, Linear/Logistic Regression, Classification, Decision Trees, Clustering (K-Means), Neural Networks, and Scikit-Learn.",
    keywords: ["ml", "machine learning", "supervised", "unsupervised", "neural network", "regression", "classification", "clustering"]
  },
  "c": {
    name: "C Programming",
    desc: "Variables, Loops, Functions, Arrays, Pointers, Memory Allocation (malloc, free), Structs, and File I/O.",
    keywords: ["c programming", "c language", "pointer", "c code", "malloc", "struct"]
  },
  "cpp": {
    name: "C++ Programming",
    desc: "Object-Oriented Programming (OOP), Classes, Inheritance, Polymorphism, Encapsulation, STL (Vectors, Maps), and Templates.",
    keywords: ["c++", "cpp", "oops", "stl", "polymorphism", "inheritance", "class object", "vector"]
  },
  "java": {
    name: "Java",
    desc: "Core Java, JVM, Bytecode, Multithreading, Exception Handling, Collections Framework (ArrayList, HashMap), JDBC, and OOP Principles.",
    keywords: ["java", "jvm", "multithreading", "collections", "jdbc", "core java", "hashmap"]
  },
  "python": {
    name: "Python",
    desc: "Python Syntax, Data Structures (Lists, Dictionaries, Sets), OOP, Modules, File Handling, and Scripting.",
    keywords: ["python", "py", "dictionary", "list comprehension", "pandas", "numpy"]
  },
  "web": {
    name: "Web Development",
    desc: "HTML5, CSS3, JavaScript, Responsive Design, DOM Manipulation, Fetch APIs, and Modern Frontend Architecture.",
    keywords: ["web", "web development", "html", "css", "javascript", "frontend", "dom", "async"]
  },
  "react": {
    name: "React.js",
    desc: "Components, JSX, Hooks (useState, useEffect, useMemo), Virtual DOM, Props, State Management, and SPAs.",
    keywords: ["react", "reactjs", "react.js", "hooks", "jsx", "state", "usestate", "useeffect"]
  },
  "node": {
    name: "Node.js & Backend",
    desc: "Event Loop, Express.js REST APIs, Asynchronous JS, Middleware, MongoDB Integration, and Microservices.",
    keywords: ["node", "nodejs", "node.js", "express", "backend", "api", "rest api", "event loop"]
  }
};

/**
 * Universal Translation Helper (Supports all 100+ World Languages)
 */
async function translateText(text, targetLang = "en", sourceLang = "auto") {
  if (!text || !text.trim()) return { text: "", detectedLang: "en" };
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    if (data && data[0]) {
      const translated = data[0].map(item => item[0]).join("");
      const detectedLang = data[2] || sourceLang;
      return { text: translated, detectedLang };
    }
  } catch (err) {
    // If translation fails or times out, fallback gracefully
  }
  return { text, detectedLang: "en" };
}

/**
 * Detect language style: 'hindi', 'hinglish', 'english', or foreign code (e.g. 'es', 'fr', 'de', 'ar')
 */
function detectLanguageStyle(text) {
  // Check for Devanagari Hindi
  if (/[\u0900-\u097F]/.test(text)) {
    return "hindi";
  }

  const hinglishMarkers = [
    "kya", "kaise", "kare", "karein", "batao", "btao", "batayein", "karo", "hain", "hai", "h", "mujhe", "apna", "apni",
    "karna", "krna", "hoga", "ho", "kaun", "kon", "kiske", "kisne", "bana", "banaya",
    "bhai", "ji", "achha", "accha", "dhanyawad", "shukriya", "bhej", "do", "padhna",
    "padhe", "dekhna", "hatao", "lao", "bolo", "suno", "namaste", "pranam", "chahiye",
    "ka", "ki", "ke", "ko", "se", "me", "mein", "par", "pe", "aur", "bhi", "kuch", "baare",
    "bataiye", "dijiye", "lekin", "kyun", "kyu", "kahan", "kab", "kisko", "kripya", "padhai"
  ];

  const words = text.toLowerCase().split(/\s+/);
  const isHinglish = words.some(w => hinglishMarkers.includes(w));
  if (isHinglish) return "hinglish";

  return "check_world";
}

/**
 * Check if the user is teaching something new and educational
 */
function extractTeachingIntent(text) {
  const lower = text.toLowerCase();
  const teachingTriggers = [
    /yaad rakh(?:na|o)?(?:\s+ki)?\s+(.+)/i,
    /note kar(?:lo|na)?(?:\s+ki)?\s+(.+)/i,
    /seekh(?:lo|na)?(?:\s+ki)?\s+(.+)/i,
    /did you know(?:\s+that)?\s+(.+)/i,
    /remember that\s+(.+)/i,
    /(?:maine bataya|mai bata raha hoon)(?:\s+ki)?\s+(.+)/i,
    /(.+?)\s+(?:ka matlab|means|is defined as)\s+(.+)/i
  ];

  for (const regex of teachingTriggers) {
    const match = text.match(regex);
    if (match) {
      const fact = (match[1] || match[2] || "").trim();
      if (fact.length > 8 && !checkProfanity(fact)) {
        return fact;
      }
    }
  }
  return null;
}

/**
 * Search stored knowledge for relevant concepts
 */
function findLearnedFact(query) {
  const lower = query.toLowerCase();
  for (const item of knowledgeMemory) {
    if (lower.includes(item.topic) || item.fact.toLowerCase().includes(lower)) {
      return item.fact;
    }
  }
  return null;
}

/**
 * Main Saarthi Query Processing Engine (Async, Multi-lingual, Academic-focused)
 */
async function processSaarthiMessage(rawMessage, userState = {}) {
  const originalText = (rawMessage || "").trim();
  if (!originalText) {
    return { reply: "Please ask a question.", topic: "general", askedAboutOwner: false, courseRequested: "" };
  }

  // ── STEP 1: PROFANITY & ABUSE FILTER (GAALI DETECTION) ────────
  if (checkProfanity(originalText)) {
    const warningReply =
      "⚠️ **कृपया मर्यादित और शालीन भाषा का प्रयोग करें।**\n\n" +
      "Elite Exam Portal एक समर्पित शैक्षणिक और अध्ययन मंच है। यहाँ किसी भी प्रकार की गाली-गलौज, अपशब्द या अनुचित भाषा का उपयोग पूर्णतः वर्जित है।\n\n" +
      "कृपया अपनी पढ़ाई, कंप्यूटर साइंस विषयों या परीक्षा से संबंधित प्रश्न ही पूछें! 📚";

    return {
      reply: warningReply,
      topic: "profanity_warning",
      askedAboutOwner: false,
      courseRequested: "",
      language: "hinglish"
    };
  }

  // ── STEP 2: WORLD LANGUAGE DETECTION & TRANSLATION PIPELINE ────
  let langStyle = detectLanguageStyle(originalText);
  let workingEnglishText = originalText;
  let targetWorldLang = null;

  if (langStyle === "check_world") {
    // Check if it is a world language (Spanish, French, German, Arabic, Bengali, etc.)
    const translation = await translateText(originalText, "en", "auto");
    workingEnglishText = translation.text;
    const detected = translation.detectedLang;

    if (detected && detected !== "en" && detected !== "hi") {
      targetWorldLang = detected;
      langStyle = "world";
    } else {
      langStyle = "english";
    }
  }

  const lowerEnglish = workingEnglishText.toLowerCase();
  const lowerOriginal = originalText.toLowerCase();

  let topic = "general";
  let askedAboutOwner = false;
  let courseRequested = "";
  let baseReply = "";

  // ── STEP 3: CHECK IF USER IS TEACHING SOMETHING GOOD & NEW ────
  const taughtFact = extractTeachingIntent(originalText);
  if (taughtFact) {
    topic = "learning";
    const topicWord = taughtFact.split(/\s+/).slice(0, 3).join(" ");

    // Save to Database asynchronously
    LearnedKnowledge.create({
      topic: topicWord,
      fact: taughtFact,
      learned_from_name: userState.user_name || "Student",
      learned_from_email: userState.user_email || "",
      verified: true
    }).catch(() => {});

    knowledgeMemory.unshift({
      topic: topicWord.toLowerCase(),
      fact: taughtFact
    });

    if (langStyle === "hindi") {
      baseReply = `बहुत-बहुत धन्यवाद! 🙏 मैंने यह महत्वपूर्ण शैक्षणिक जानकारी सीख ली है:\n\n📌 **"${taughtFact}"**\n\nमैंने इसे अपने ज्ञानकोष में सुरक्षित कर लिया है और भविष्य में अन्य विद्यार्थियों के अध्ययन में इसका उपयोग करूँगा! 🚀`;
    } else if (langStyle === "hinglish") {
      baseReply = `Bohat-bohat shukriya! 🙏 Maine ye achhi aur helpful jankari seekh kar apne brain me save kar li hai:\n\n📌 **"${taughtFact}"**\n\nMain aage se is knowledge ko students ki padhai aur guidance me zaroor use karunga! 🚀`;
    } else {
      baseReply = `Thank you so much! 🙏 I have learned and saved this valuable educational concept:\n\n📌 **"${taughtFact}"**\n\nI will remember this and utilize it to assist students in future academic queries! 🚀`;
    }

    return await formatFinalResponse(baseReply, targetWorldLang, topic, false, "");
  }

  // ── STEP 4: CHECK CONFIRMATION FOR MISSING COURSE FEEDBACK ────
  const isConfirming = /\b(yes|haan|ha|bhej do|kar do|bhejo|sure|okay|ok|please|kardo|kr do)\b/i.test(lowerOriginal);
  if (isConfirming && userState.lastSuggestedCourse) {
    topic = "course_request";
    courseRequested = userState.lastSuggestedCourse;

    if (langStyle === "hindi") {
      baseReply = `बहुत-बहुत धन्यवाद! 🙏 मैंने **${courseRequested}** का अनुरोध सीधे **सुमित जी** को नोट करा दिया है। वे जल्द ही इस विषय के महत्वपूर्ण प्रश्न पोर्टल पर लाइव कर देंगे। 🚀`;
    } else if (langStyle === "hinglish") {
      baseReply = `Bohat-bohat shukriya! 🙏 Maine **${courseRequested}** ka request seedha **Sumit ji** ko forward kar diya hai. Wo jald hi is subject ke best practice questions website par update kar denge! 🚀`;
    } else {
      baseReply = `Thank you! 🙏 I have successfully forwarded your request for **${courseRequested}** directly to **Sumit Dwivedi**. He will work on adding this subject to the exam portal soon! 🚀`;
    }

    return await formatFinalResponse(baseReply, targetWorldLang, topic, false, courseRequested);
  }

  // ── STEP 5: CREATOR INQUIRY (STRICTLY ONLY WHEN EXPLICITLY ASKED) ──
  const ownerKeywords = [
    "sumit", "sumit dwivedi", "creator", "owner", "developer", "founder", "admin", "banaya",
    "kisne banaya", "who made", "who created", "who is the developer", "who is the owner", "author", "maker"
  ];

  const isAskingAboutOwner = ownerKeywords.some(k => lowerOriginal.includes(k) || lowerEnglish.includes(k));
  if (isAskingAboutOwner) {
    topic = "owner_info";
    askedAboutOwner = true;

    if (langStyle === "hindi") {
      baseReply =
        `✨ **सुमित द्विवेदी (Sumit Dwivedi)** इस Exam Portal के निर्माता और मुख्य डेवलपर हैं।\n\n` +
        `🎓 **परिचय:** वे एक MCA छात्र और Full-Stack Software Developer हैं, जिन्होंने छात्रों की परीक्षा तैयारी को आसान, मुफ्त और प्रभावी बनाने के लिए इस प्लेटफॉर्म का निर्माण किया है।\n\n` +
        `🌐 **सुमित जी से संपर्क सूत्र:**\n` +
        `• 💻 **GitHub:** [github.com/sumitdwivedi681-ops](${CREATOR_INFO.github})\n` +
        `• 💼 **LinkedIn:** [linkedin.com/in/sumit-dwivedi](${CREATOR_INFO.linkedin})\n` +
        `• 📸 **Instagram:** [${CREATOR_INFO.instagram_handle}](${CREATOR_INFO.instagram})\n` +
        `• ✉️ **Email:** ${CREATOR_INFO.email}\n\n` +
        `आप उनसे किसी भी प्रोजेक्ट, मार्गदर्शन या फीडबैक के लिए सीधे जुड़ सकते हैं!`;
    } else if (langStyle === "hinglish") {
      baseReply =
        `✨ **Sumit Dwivedi** is Exam Portal ke creator aur developer hain!\n\n` +
        `🎓 **About Sumit:** Wo ek MCA student aur Full-Stack Web Developer hain, jinhone students ke computer science concepts aur free mock tests ke liye ye website banayi hai.\n\n` +
        `🔗 **Sumit ji ke Social Profiles:**\n` +
        `• 💻 **GitHub:** [github.com/sumitdwivedi681-ops](${CREATOR_INFO.github})\n` +
        `• 💼 **LinkedIn:** [linkedin.com/in/sumit-dwivedi](${CREATOR_INFO.linkedin})\n` +
        `• 📸 **Instagram:** [${CREATOR_INFO.instagram_handle}](${CREATOR_INFO.instagram})\n` +
        `• ✉️ **Email:** ${CREATOR_INFO.email}\n\n` +
        `Aap unse directly contact kar sakte hain!`;
    } else {
      baseReply =
        `✨ **Sumit Dwivedi** is the creator, developer, and architect of Elite Exam Portal.\n\n` +
        `🎓 **Background:** He is an MCA student and passionate Full-Stack Developer who designed this platform to provide free, high-performance mock tests and study assessments for students.\n\n` +
        `🔗 **Connect with Sumit:**\n` +
        `• 💻 **GitHub:** [github.com/sumitdwivedi681-ops](${CREATOR_INFO.github})\n` +
        `• 💼 **LinkedIn:** [linkedin.com/in/sumit-dwivedi](${CREATOR_INFO.linkedin})\n` +
        `• 📸 **Instagram:** [${CREATOR_INFO.instagram_handle}](${CREATOR_INFO.instagram})\n` +
        `• ✉️ **Email:** ${CREATOR_INFO.email}`;
    }

    return await formatFinalResponse(baseReply, targetWorldLang, topic, askedAboutOwner, "");
  }

  // ── STEP 6: WEBSITE NAVIGATION & HOW-TO-USE GUIDE ─────────────
  const guideKeywords = [
    "kaise use", "how to use", "guide", "help", "kya kare", "test kaise de", "exam kaise",
    "start test", "register", "login", "result", "score", "photo", "profile photo", "features"
  ];

  if (guideKeywords.some(k => lowerOriginal.includes(k) || lowerEnglish.includes(k))) {
    topic = "guide";

    if (langStyle === "hindi") {
      baseReply =
        `📚 **Exam Portal का उपयोग कैसे करें (चरण-दर-चरण मार्गदर्शिका):**\n\n` +
        `1️⃣ **रजिस्टर / लॉगिन:** अपना नाम, ईमेल और कोर्स चुनकर फ्री अकाउंट बनाएं या Google से 1-क्लिक में लॉगिन करें।\n` +
        `2️⃣ **विषय चुनें (Pick Subject):** 'Subjects' सेक्शन में जाकर अपने विषय (DSA, OS, DBMS, Python, AI आदि) के **'Start Test'** पर क्लिक करें।\n` +
        `3️⃣ **टेस्ट दें:** प्रत्येक प्रश्न का सही विकल्प चुनें और अंत में **'Submit Test'** दबाएं।\n` +
        `4️⃣ **रिजल्ट देखें:** सबमिट करते ही आपका स्कोर और विस्तृत विश्लेषण तुरंत स्क्रीन पर आ जाएगा।\n` +
        `5️⃣ **प्रोफाइल फोटो:** 'My Profile' में जाकर आप अपने फोन या कंप्यूटर से अपनी वास्तविक फोटो अपलोड कर सकते हैं!\n\n` +
        `💡 क्या आप किसी विशेष विषय का टेस्ट अभी देना चाहते हैं?`;
    } else if (langStyle === "hinglish") {
      baseReply =
        `📚 **Website use karne ka simple step-by-step guide:**\n\n` +
        `1️⃣ **Register / Login:** Pehle Student Account banayein ya 1-click Google Sign-in karein.\n` +
        `2️⃣ **Select Subject:** **'Subjects'** page par jakar apne subject (DSA, OS, DBMS, Python, AI, etc.) ke **'Start Test'** par click karein.\n` +
        `3️⃣ **Attempt Questions:** Options select karein aur end me **'Submit Test'** dabayein.\n` +
        `4️⃣ **Instant Results:** Turant apna scorecard aur performance graph dekhein.\n` +
        `5️⃣ **Profile Photo:** Dashboard ke **'My Profile'** me jakar aap apni gallery ya PC se photo upload kar sakte hain!\n\n` +
        `Aapko kis subject ki padhai ya test dena hai? Mujhe batayein!`;
    } else {
      baseReply =
        `📚 **Quick Guide — How to use Elite Exam Portal:**\n\n` +
        `1️⃣ **Register/Login:** Sign up with your student email or use 1-click Google Login.\n` +
        `2️⃣ **Choose a Subject:** Visit the **Subjects** section and pick from 16+ courses.\n` +
        `3️⃣ **Take Practice Test:** Answer questions in a distraction-free exam interface.\n` +
        `4️⃣ **View Instant Results:** Get detailed analytics, scoring, and performance evaluation.\n` +
        `5️⃣ **Profile Customization:** Upload your real profile photo from gallery/file explorer in 'My Profile'!`;
    }

    return await formatFinalResponse(baseReply, targetWorldLang, topic, false, "");
  }

  // ── STEP 7: CHECK FOR AVAILABLE SUBJECTS ───────────────────────
  for (const [key, subject] of Object.entries(AVAILABLE_SUBJECTS)) {
    const isMatched = subject.keywords.some(k => lowerOriginal.includes(k) || lowerEnglish.includes(k));
    if (isMatched) {
      topic = "subject";

      // Check if we also have any user-taught knowledge for this topic
      const learnedAddon = findLearnedFact(subject.name);
      const learnedSection = learnedAddon ? `\n\n💡 *अतिरिक्त ज्ञान (Learned Insight):* ${learnedAddon}` : "";

      if (langStyle === "hindi") {
        baseReply =
          `📖 **${subject.name}**\n\n` +
          `📌 **मुख्य अवधारणाएँ:** ${subject.desc}${learnedSection}\n\n` +
          `✨ यह विषय हमारे Exam Portal पर पूरी तरह **उपलब्ध** है! आप 'Subjects' सेक्शन में जाकर इसका टेस्ट शुरू कर सकते हैं।`;
      } else if (langStyle === "hinglish") {
        baseReply =
          `📖 **${subject.name}**\n\n` +
          `📌 **Concepts & Topics:** ${subject.desc}${learnedSection}\n\n` +
          `✨ Ye subject hamare Exam Portal par **Available** hai! Aap 'Subjects' page par jakar iska test start karke achhi practice kar sakte hain.`;
      } else {
        baseReply =
          `📖 **${subject.name}**\n\n` +
          `📌 **Key Topics & Concepts:** ${subject.desc}${learnedSection}\n\n` +
          `✨ This subject is **Available** on the Exam Portal! You can start practicing its curated questions in the Subjects section right away.`;
      }

      return await formatFinalResponse(baseReply, targetWorldLang, topic, false, "");
    }
  }

  // ── STEP 8: CHECK FOR UNAVAILABLE / MISSING SUBJECTS ──────────
  const potentialMissingTech = [
    "flutter", "dart", "golang", "go language", "rust", "kotlin", "swift", "devops",
    "docker", "kubernetes", "k8s", "blockchain", "solidity", "web3", "django", "spring boot",
    "angular", "vue", "graphql", "nextjs", "next.js", "ruby", "rails", "r programming",
    "discrete mathematics", "coa", "computer organization", "toc", "compiler design", "data science"
  ];

  for (const tech of potentialMissingTech) {
    if (lowerOriginal.includes(tech) || lowerEnglish.includes(tech)) {
      topic = "course_request";
      courseRequested = tech.toUpperCase();

      if (langStyle === "hindi") {
        baseReply =
          `🔍 **${courseRequested}** एक अत्यंत महत्वपूर्ण और आधुनिक विषय है!\n\n` +
          `⚠️ वर्तमान में यह विषय हमारे Exam Portal पर उपलब्ध नहीं है।\n\n` +
          `💬 **क्या मैं आपका यह अनुरोध / फीडबैक सीधे सुमित जी को भेज दूँ**, ताकि वे इस विषय को पोर्टल पर अपडेट कर दें? (कृपया 'हाँ' या 'ना' में बताएं)`;
      } else if (langStyle === "hinglish") {
        baseReply =
          `🔍 **${courseRequested}** ek bohot hi important topic hai!\n\n` +
          `⚠️ Abhi ye subject Exam Portal par live nahi hai.\n\n` +
          `💬 **Kya main aapka ye feedback Sumit ji ko de dun taaki wo ise jaldi se website par update kar dein?** (Aap 'Haan' ya 'Yes' bol sakte hain!)`;
      } else {
        baseReply =
          `🔍 **${courseRequested}** is a high-demand academic subject!\n\n` +
          `⚠️ Currently, test questions for this subject are not yet available on the Exam Portal.\n\n` +
          `💬 **Would you like me to forward this feedback directly to Sumit Dwivedi (Creator)** so he can add and update this subject on the portal? (Reply Yes/No)`;
      }

      const res = await formatFinalResponse(baseReply, targetWorldLang, topic, false, courseRequested);
      res.lastSuggestedCourse = courseRequested;
      return res;
    }
  }

  // ── STEP 9: CHECK FOR ANY LEARNED FACT IN MEMORY ───────────────
  const matchingFact = findLearnedFact(originalText);
  if (matchingFact) {
    baseReply = `💡 **Academic Concept:**\n\n${matchingFact}\n\nKya aapko is concept ya kisi specific computer science subject ke baare me aur detail chahiye?`;
    return await formatFinalResponse(baseReply, targetWorldLang, "subject", false, "");
  }

  // ── STEP 10: GREETINGS & STUDY FOCUS ──────────────────────────
  const greetings = ["hi", "hello", "hey", "sarthi", "saarthi", "namaste", "pranam", "kaise ho", "kese ho", "who are you"];
  if (greetings.some(g => lowerOriginal === g || lowerOriginal.startsWith(g + " ") || lowerEnglish === g)) {
    if (langStyle === "hindi") {
      baseReply =
        `नमस्ते! 🙏 मैं **सारथी (Saarthi)** हूँ — Elite Exam Portal का आपका पर्सनल AI एकेडमिक साथी। 📚\n\n` +
        `मैं आपकी पढ़ाई और तैयारी में इन चीज़ों में मदद कर सकता हूँ:\n` +
        `• 📖 किसी भी कंप्यूटर साइंस विषय (DSA, OS, DBMS, Python, AI आदि) की समझ\n` +
        `• 🚀 पोर्टल पर टेस्ट देने का तरीका और स्कोर सुधारना\n` +
        `• 💡 किसी नए विषय को पोर्टल पर जुड़वाने का अनुरोध\n` +
        `• 🧠 यदि आपके पास कोई उपयोगी शैक्षणिक जानकारी है तो वह मुझे सिखाना\n\n` +
        `आज आप किस विषय का अभ्यास या अध्ययन करना चाहते हैं?`;
    } else if (langStyle === "hinglish") {
      baseReply =
        `Hello! 🙏 Main **Saarthi** hoon — Elite Exam Portal ka aapka AI Academic Assistant. 📚\n\n` +
        `Main aapki padhai me help kar sakta hoon:\n` +
        `• 📖 Kisi bhi subject (DSA, OS, DBMS, Web, Python etc.) ke concepts samajhna\n` +
        `• 🚀 Practice tests aur scorecard guide\n` +
        `• 💡 Naye subjects add karne ka request\n` +
        `• 🧠 Naye academic concepts sikhana\n\n` +
        `Aap aaj kis subject ki padhai ya practice karna chahte hain?`;
    } else {
      baseReply =
        `Hello! 🙏 I am **Saarthi**, your personal AI Academic Guide on Elite Exam Portal. 📚\n\n` +
        `I am here to assist you with:\n` +
        `• 📖 Clarifying computer science concepts (DSA, OS, DBMS, AI, Python, etc.)\n` +
        `• 🚀 Guiding you through practice tests and performance tracking\n` +
        `• 💡 Requesting new subjects to be added to the portal\n` +
        `• 🧠 Learning new educational insights you wish to share\n\n` +
        `Which subject or topic would you like to study today?`;
    }
    return await formatFinalResponse(baseReply, targetWorldLang, "general", false, "");
  }

  // ── STEP 11: ACADEMIC FALLBACK (ALWAYS FOCUSED ON STUDIES) ─────
  if (langStyle === "hindi") {
    baseReply = `मैं आपकी बात समझ रहा हूँ! मैं विशेष रूप से कंप्यूटर साइंस के विषयों (DSA, OS, DBMS, Networks, Python, AI, Web Dev आदि) और परीक्षा की तैयारी में आपकी सहायता के लिए यहाँ हूँ। कृपया अपना प्रश्न अपने विषय या अध्ययन से संबंधित विस्तार से पूछें! 📚`;
  } else if (langStyle === "hinglish") {
    baseReply = `Main samajh raha hoon! Main specially aapki padhai aur exam preparation (DSA, OS, DBMS, Python, AI, Web Development etc.) me help karne ke liye banaya gaya hoon. Kripya apna sawaal kisi subject ya padhai se related puchein! 📚`;
  } else {
    baseReply = `I am here to assist with your academic journey! I specialize in computer science subjects (Data Structures, Algorithms, OS, DBMS, AI, Python, Web Dev) and exam preparation. Please ask your question related to any study topic or exam! 📚`;
  }

  return await formatFinalResponse(baseReply, targetWorldLang, "general", false, "");
}

/**
 * Format final response and translate to target world language if applicable
 */
async function formatFinalResponse(replyText, targetWorldLang, topic, askedAboutOwner, courseRequested) {
  let finalReply = replyText;
  let finalLanguage = targetWorldLang || "hinglish";

  if (targetWorldLang && targetWorldLang !== "en" && targetWorldLang !== "hi") {
    try {
      const back = await translateText(replyText, targetWorldLang, "en");
      if (back && back.text) {
        finalReply = back.text;
      }
    } catch (e) {
      // Fallback to English reply
    }
  }

  return {
    reply: finalReply,
    topic,
    askedAboutOwner: Boolean(askedAboutOwner),
    courseRequested: courseRequested || "",
    language: finalLanguage
  };
}

module.exports = {
  processSaarthiMessage,
  AVAILABLE_SUBJECTS,
  CREATOR_INFO,
  checkProfanity
};
