
  //  SAARTHI  — AI Academic Assistant Engine  



const CREATOR_INFO = {
  name: "Sumit Dwivedi",
  title: "MCA Student & Full Stack Web Developer",
  role: "Creator & Architect of Elite Exam Portal",
  bio: "Sumit Dwivedi is an MCA student and full-stack software developer who designed and engineered this Exam Portal to empower students with free, real-time practice tests and instant performance analytics.",
  github: "https://github.com/sumitdwivedi681-ops",
  linkedin: "https://www.linkedin.com/in/sumit-dwivedi-76965b386/",
  instagram: "https://www.instagram.com/sumitdwivedi_/",
  email: "sumitdwivedi681@gmail.com"
};

const AVAILABLE_SUBJECTS = {
  "dsa": {
    name: "Data Structures & Algorithms (DSA)",
    desc: "Arrays, Linked Lists, Stacks, Queues, Trees, Graphs, Sorting, Searching, Dynamic Programming, and Time-Complexity.",
    keywords: ["dsa", "data structure", "algorithm", "tree", "graph", "stack", "queue", "array", "linked list"]
  },
  "os": {
    name: "Operating System (OS)",
    desc: "Process Management, CPU Scheduling, Threads, Deadlocks, Memory Management, Paging, Virtual Memory, and File Systems.",
    keywords: ["os", "operating system", "process", "thread", "deadlock", "scheduling", "paging", "memory management"]
  },
  "dbms": {
    name: "Database Management System (DBMS)",
    desc: "Relational Models, SQL Queries, Normalization (1NF to BCNF), ACID Properties, Transactions, Indexing, and ER Diagrams.",
    keywords: ["dbms", "database", "sql", "normalization", "acid", "relational", "mongo", "table"]
  },
  "cn": {
    name: "Computer Networks (CN)",
    desc: "OSI Model, TCP/IP, IP Addressing (IPv4/IPv6), Routing, Subnetting, Switching, DNS, HTTP, and Network Security.",
    keywords: ["cn", "computer network", "networking", "osi", "tcp", "udp", "ip", "router", "switch", "subnet"]
  },
  "se": {
    name: "Software Engineering",
    desc: "SDLC Models (Agile, Waterfall), Requirement Engineering, UML, Software Testing (Black/White box), and Maintenance.",
    keywords: ["software engineering", "sdlc", "agile", "waterfall", "uml", "testing", "scrum"]
  },
  "cloud": {
    name: "Cloud Computing",
    desc: "IaaS, PaaS, SaaS, AWS, Azure, Virtualization, Cloud Architecture, Deployment Models, and Serverless.",
    keywords: ["cloud", "aws", "azure", "cloud computing", "saas", "paas", "iaas", "virtualization"]
  },
  "cyber": {
    name: "Cyber Security",
    desc: "Network Security, Ethical Hacking, Cryptography, Firewalls, Malware, Phishing, and Cyber Defense.",
    keywords: ["cyber", "cyber security", "hacking", "ethical hacking", "cryptography", "firewall", "security"]
  },
  "ai": {
    name: "Artificial Intelligence (AI)",
    desc: "Search Algorithms (A*, BFS, DFS), Knowledge Representation, Expert Systems, Game Playing, NLP, and Logic.",
    keywords: ["ai", "artificial intelligence", "intelligent", "expert system", "nlp", "heuristic", "search algorithm"]
  },
  "ml": {
    name: "Machine Learning (ML)",
    desc: "Supervised & Unsupervised Learning, Regression, Classification, Clustering, Neural Networks, and Scikit-Learn.",
    keywords: ["ml", "machine learning", "supervised", "unsupervised", "neural network", "regression", "classification"]
  },
  "c": {
    name: "C Programming",
    desc: "Variables, Loops, Functions, Arrays, Pointers, Structures, Memory Allocation (malloc/free), and File I/O.",
    keywords: ["c programming", "c language", "pointer", "c code", "malloc"]
  },
  "cpp": {
    name: "C++ Programming",
    desc: "Object-Oriented Programming (OOP), Classes, Inheritance, Polymorphism, Encapsulation, STL, and Templates.",
    keywords: ["c++", "cpp", "oops", "stl", "polymorphism", "inheritance", "class object"]
  },
  "java": {
    name: "Java",
    desc: "Core Java, JVM, Multithreading, Exception Handling, Collections Framework, JDBC, and OOP Principles.",
    keywords: ["java", "jvm", "multithreading", "collections", "jdbc", "core java"]
  },
  "python": {
    name: "Python",
    desc: "Python Syntax, Data Structures (Lists, Dictionaries), OOP, Modules, File Handling, and Scripting.",
    keywords: ["python", "py", "dictionary", "list comprehension", "pandas"]
  },
  "web": {
    name: "Web Development",
    desc: "HTML5, CSS3, JavaScript, Responsive Design, DOM Manipulation, APIs, and Modern Frontend Architecture.",
    keywords: ["web", "web development", "html", "css", "javascript", "frontend", "dom"]
  },
  "react": {
    name: "React.js",
    desc: "Components, JSX, Hooks (useState, useEffect), Virtual DOM, State Management, and Single Page Applications.",
    keywords: ["react", "reactjs", "react.js", "hooks", "jsx", "state"]
  },
  "node": {
    name: "Node.js & Backend",
    desc: "Event Loop, Express.js REST APIs, Asynchronous JS, Middleware, MongoDB Integration, and Microservices.",
    keywords: ["node", "nodejs", "node.js", "express", "backend", "api"]
  }
};

/**
 * Detect language: 'hindi', 'english', or 'hinglish'
 */
function detectLanguage(text) {
  // Check for Devanagari Unicode range
  if (/[\u0900-\u097F]/.test(text)) {
    return "hindi";
  }
  
  const hinglishMarkers = [
    "kya", "kaise", "kare", "karein", "batao", "btao", "batayein", "karo", "hain", "hai", "h", "mujhe", "apna", "apni",
    "karna", "krna", "hoga", "ho", "kaun", "kon", "kiske", "kisne", "bana", "banaya",
    "bhai", "ji", "achha", "accha", "dhanyawad", "shukriya", "bhej", "do", "padhna",
    "padhe", "dekhna", "hatao", "lao", "bolo", "suno", "namaste", "pranam", "chahiye",
    "ka", "ki", "ke", "ko", "se", "me", "mein", "par", "pe", "aur", "bhi", "kuch", "baare",
    "bataiye", "dijiye", "lekin", "kyun", "kyu", "kahan", "kab", "kisko", "kripya"
  ];
  
  const words = text.toLowerCase().split(/\s+/);
  const isHinglish = words.some(w => hinglishMarkers.includes(w));
  
  return isHinglish ? "hinglish" : "english";
}

/**
 * Main Saarthi Query Processing Engine
 */
function processSaarthiMessage(rawMessage, userState = {}) {
  const text = (rawMessage || "").trim();
  const lower = text.toLowerCase();
  const lang = detectLanguage(text);

  let topic = "general";
  let askedAboutOwner = false;
  let courseRequested = "";
  let reply = "";
  let actionSuggestion = null;

  // ── 1. CHECK IF USER IS CONFIRMING A FEEDBACK / SUBJECT REQUEST ──
  const isConfirming = /\b(yes|haan|ha|bhej do|kar do|bhejo|sure|okay|ok|please|kardo|kr do)\b/i.test(lower);
  if (isConfirming && userState.lastSuggestedCourse) {
    topic = "course_request";
    courseRequested = userState.lastSuggestedCourse;
    
    if (lang === "hindi") {
      reply = `बहुत-बहुत धन्यवाद! 🙏 मैंने **${courseRequested}** का अनुरोध सीधे **सुमित जी** को नोट करा दिया है। वे जल्द ही इस विषय के महत्वपूर्ण प्रश्न पोर्टल पर लाइव कर देंगे। 🚀`;
    } else if (lang === "hinglish") {
      reply = `Bohat-bohat shukriya! 🙏 Maine **${courseRequested}** ka request seedha **Sumit ji** ko forward kar diya hai. Wo jald hi is subject ke best practice questions website par update kar denge! 🚀`;
    } else {
      reply = `Thank you so much! 🙏 I have officially forwarded your request for **${courseRequested}** directly to **Sumit Dwivedi**. He will update and add this subject to the portal soon! 🚀`;
    }

    return {
      reply,
      topic,
      askedAboutOwner: false,
      courseRequested,
      language: lang,
      feedbackApproved: true
    };
  }

  // ── 2. QUESTIONS ABOUT CREATOR / SUMIT DWIVEDI ──
  const ownerKeywords = [
    "sumit", "sumit dwivedi", "owner", "creator", "developer", "founder", "admin", "banaya",
    "kisne banaya", "who made", "who created", "who is the developer", "social", "contact",
    "github", "linkedin", "instagram", "insta", "profile", "author", "maker"
  ];

  if (ownerKeywords.some(k => lower.includes(k))) {
    topic = "owner_info";
    askedAboutOwner = true;

    if (lang === "hindi") {
      reply = `✨ **सुमित द्विवेदी (Sumit Dwivedi)** इस Exam Portal के निर्माता और डेवलपर हैं।\n\n` +
              `🎓 **परिचय:** वे एक उत्साही MCA छात्र और Full-Stack Developer हैं, जिन्होंने छात्रों की परीक्षा तैयारी को आसान और मुफ्त बनाने के लिए इस प्लेटफॉर्म को बनाया है।\n\n` +
              `🌐 **सुमित जी से जुड़ें:**\n` +
              `• 💻 **GitHub:** [github.com/sumitdwivedi681-ops](${CREATOR_INFO.github})\n` +
              `• 💼 **LinkedIn:** [linkedin.com/in/sumit-dwivedi](${CREATOR_INFO.linkedin})\n` +
              `• 📸 **Instagram:** [@sumitdwivedi_](${CREATOR_INFO.instagram})\n` +
              `• ✉️ **Email:** ${CREATOR_INFO.email}\n\n` +
              `आप उनसे किसी भी प्रोजेक्ट, कोलैबोरेशन या मार्गदर्शन के लिए सीधे संपर्क कर सकते हैं!`;
    } else if (lang === "hinglish") {
      reply = `✨ **Sumit Dwivedi** is Exam Portal ke creator aur developer hain!\n\n` +
              `🎓 **About Sumit:** Wo ek talented MCA student aur Full-Stack Web Developer hain, jinhone students ke computer science concepts aur practice tests ko free & fast banane ke liye ye website design aur engineer ki hai.\n\n` +
              `🔗 **Sumit ji ke Social & Professional Profiles:**\n` +
              `• 💻 **GitHub:** [github.com/sumitdwivedi681-ops](${CREATOR_INFO.github})\n` +
              `• 💼 **LinkedIn:** [linkedin.com/in/sumit-dwivedi](${CREATOR_INFO.linkedin})\n` +
              `• 📸 **Instagram:** [@sumitdwivedi_](${CREATOR_INFO.instagram})\n` +
              `• ✉️ **Email:** ${CREATOR_INFO.email}\n\n` +
              `Aap unse directly connect kar sakte hain ya feedback share kar sakte hain!`;
    } else {
      reply = `✨ **Sumit Dwivedi** is the creator, developer, and architect of Elite Exam Portal.\n\n` +
              `🎓 **Background:** He is an MCA student and passionate Full-Stack Developer who built this platform to provide free, high-performance mock exams and subject assessments for engineering & computer applications students.\n\n` +
              `🔗 **Connect with Sumit:**\n` +
              `• 💻 **GitHub:** [github.com/sumitdwivedi681-ops](${CREATOR_INFO.github})\n` +
              `• 💼 **LinkedIn:** [linkedin.com/in/sumit-dwivedi](${CREATOR_INFO.linkedin})\n` +
              `• 📸 **Instagram:** [@sumitdwivedi_](${CREATOR_INFO.instagram})\n` +
              `• ✉️ **Email:** ${CREATOR_INFO.email}`;
    }

    return { reply, topic, askedAboutOwner, courseRequested: "", language: lang };
  }

  // ── 3. QUESTIONS ABOUT WEBSITE USAGE / HOW TO USE ──
  const guideKeywords = [
    "kaise use", "how to use", "guide", "help", "kya kare", "test kaise de", "exam kaise",
    "start test", "register", "login", "result", "score", "photo", "profile photo", "features",
    "step", "steps", "instructions"
  ];

  if (guideKeywords.some(k => lower.includes(k))) {
    topic = "guide";

    if (lang === "hindi") {
      reply = `📚 **Exam Portal का उपयोग कैसे करें (सरल मार्गदर्शिका):**\n\n` +
              `1️⃣ **रजिस्टर / लॉगिन:** सबसे पहले अपना नाम, ईमेल और कोर्स चुनकर फ्री अकाउंट बनाएं या Google से 1-क्लिक में लॉगिन करें।\n` +
              `2️⃣ **विषय चुनें (Pick Subject):** 'Subjects' सेक्शन में जाएं और जिस विषय का टेस्ट देना हो (जैसे DSA, OS, DBMS, Python), उसके **'Start Test'** पर क्लिक करें।\n` +
              `3️⃣ **टेस्ट दें (Take Test):** हर टेस्ट में महत्वपूर्ण बहुविकल्पीय (MCQ) प्रश्न होंगे। सही विकल्प चुनें और 'Submit Test' दबाएं।\n` +
              `4️⃣ **रिजल्ट और स्कोरकार्ड:** टेस्ट पूरा होते ही आपको तुरंत आपका स्कोर और एक डिजिटल विज़ुअल चार्ट दिखेगा।\n` +
              `5️⃣ **प्रोफाइल फोटो:** आप अपने डैशबोर्ड के 'My Profile' में जाकर फोन की गैलरी या कंप्यूटर से अपनी वास्तविक फोटो भी लगा सकते हैं!\n\n` +
              `💡 क्या आप कोई विशेष विषय का अभ्यास अभी शुरू करना चाहते हैं?`;
    } else if (lang === "hinglish") {
      reply = `📚 **Website use karne ka simple step-by-step guide:**\n\n` +
              `1️⃣ **Register / Login:** Pehle apna Student Account banayein ya Google button se 1-click me direct login karein.\n` +
              `2️⃣ **Select Subject:** **'Subjects'** page par jakar apne pasandida subject (DSA, OS, DBMS, Python, etc.) ke **'Start Test'** button par click karein.\n` +
              `3️⃣ **Attempt Questions:** Har question ka option select karke next karte jayein aur end me **'Submit Test'** dabayein.\n` +
              `4️⃣ **Instant Results:** Submit karte hi turant aapka accurate score aur visual performance chart screen par aa jayega.\n` +
              `5️⃣ **Profile Photo Update:** Dashboard ke **'My Profile'** tab me jakar aap apne phone gallery ya PC se apni real photo upload kar sakte hain!\n\n` +
              `Aapko kisi specific subject ka test dena hai? Mujhe batayein!`;
    } else {
      reply = `📚 **Quick Guide — How to use Elite Exam Portal:**\n\n` +
              `1️⃣ **Sign Up / Login:** Register with your name, email, and course or use 1-click Google Sign-in.\n` +
              `2️⃣ **Browse Subjects:** Go to the **Subjects** section and choose from 15+ subjects (DSA, OS, DBMS, Web Dev, Python, AI, etc.).\n` +
              `3️⃣ **Take the Practice Test:** Answer questions and track your answers effortlessly with our distraction-free interface.\n` +
              `4️⃣ **Instant Feedback:** View real-time scores, performance charts, and test history on your dashboard.\n` +
              `5️⃣ **Profile Personalization:** Upload your personal profile picture directly from your phone gallery or PC file explorer in 'My Profile'!\n\n` +
              `Feel free to ask about any specific subject!`;
    }

    return { reply, topic, askedAboutOwner, courseRequested: "", language: lang };
  }

  // ── 4. CHECK FOR MATCHING AVAILABLE SUBJECTS ──
  for (const [key, subject] of Object.entries(AVAILABLE_SUBJECTS)) {
    const isMatched = subject.keywords.some(k => lower.includes(k));
    if (isMatched) {
      topic = "subject";

      if (lang === "hindi") {
        reply = `📖 **${subject.name}**\n\n` +
                `📌 **संक्षिप्त विवरण:** ${subject.desc}\n\n` +
                `✨ यह विषय हमारे Exam Portal पर पूरी तरह उपलब्ध है! आप इसके अभ्यास प्रश्न हल करके अपनी तैयारी को मजबूत कर सकते हैं।\n\n` +
                `👉 अभी टेस्ट शुरू करने के लिए 'Subjects' पेज पर जाएं या मुझे बताएं!`;
      } else if (lang === "hinglish") {
        reply = `📖 **${subject.name}**\n\n` +
                `📌 **Overview:** ${subject.desc}\n\n` +
                `✨ Ye subject hamare Exam Portal par **Available** hai! Aap iske best exam MCQs practice karke apna score improve kar sakte hain.\n\n` +
                `👉 Test dene ke liye **Subjects** section me jakar iska test start kar sakte hain!`;
      } else {
        reply = `📖 **${subject.name}**\n\n` +
                `📌 **Overview:** ${subject.desc}\n\n` +
                `✨ This subject is **Available** on the Exam Portal! You can test your knowledge right away with curated MCQs in the Subjects section.`;
      }

      return { reply, topic, askedAboutOwner, courseRequested: "", language: lang };
    }
  }

  // ── 5. CHECK IF USER IS ASKING ABOUT AN UNAVAILABLE / MISSING SUBJECT ──
  const potentialMissingTech = [
    "flutter", "dart", "golang", "go language", "rust", "kotlin", "swift", "devops",
    "docker", "kubernetes", "k8s", "blockchain", "solidity", "web3", "django", "spring boot",
    "angular", "vue", "graphql", "nextjs", "next.js", "ruby", "rails", "r programming",
    "discrete mathematics", "coa", "computer organization", "toc", "compiler design", "data science"
  ];

  for (const tech of potentialMissingTech) {
    if (lower.includes(tech)) {
      topic = "course_request";
      courseRequested = tech.toUpperCase();

      if (lang === "hindi") {
        reply = `🔍 **${courseRequested}** एक बेहतरीन और महत्वपूर्ण विषय है!\n\n` +
                `⚠️ वर्तमान में यह विषय हमारे Exam Portal पर लाइव नहीं है।\n\n` +
                `💬 **क्या मैं आपका यह अनुरोध / फीडबैक सीधे सुमित जी (वेबसाइट निर्माता) को भेज दूँ**, ताकि वे इस विषय के प्रश्न जल्द ही पोर्टल पर जोड़ दें? (हाँ / ना में बताएं)`;
      } else if (lang === "hinglish") {
        reply = `🔍 **${courseRequested}** ek bohot hi important aur popular topic hai!\n\n` +
                `⚠️ Abhi ye subject Exam Portal par live nahi hai.\n\n` +
                `💬 **Kya main aapka ye feedback Sumit ji ko de dun taaki wo ise jaldi se website par update kar dein?** (Aap 'Haan' ya 'Yes' bol sakte hain!)`;
      } else {
        reply = `🔍 **${courseRequested}** is a high-demand topic!\n\n` +
                `⚠️ Currently, questions for this subject are not yet available on the Exam Portal.\n\n` +
                `💬 **Would you like me to share this feedback directly with Sumit Dwivedi (Creator)** so he can add and update this subject to the portal? (Reply Yes/No)`;
      }

      return {
        reply,
        topic,
        askedAboutOwner: false,
        courseRequested,
        language: lang,
        lastSuggestedCourse: courseRequested
      };
    }
  }

  // ── 6. GREETINGS & GENERAL CONVERSATION ──
  const greetings = ["hi", "hello", "hey", "sarthi", "saarthi", "namaste", "pranam", "kaise ho", "kese ho", "who are you"];
  if (greetings.some(g => lower === g || lower.startsWith(g + " "))) {
    if (lang === "hindi") {
      reply = `नमस्ते! 🙏 मैं **सारथी (Saarthi)** हूँ — Elite Exam Portal का आपका पर्सनल AI एकेडमिक साथी।\n\n` +
              `मैं आपकी इन चीज़ों में मदद कर सकता हूँ:\n` +
              `• 📚 किसी भी विषय (DSA, OS, DBMS, AI, Python आदि) को समझना\n` +
              `• 🚀 पोर्टल का उपयोग और टेस्ट देने का तरीका जानना\n` +
              `• 👨‍💻 पोर्टल के निर्माता (सुमित द्विवेदी) के बारे में जानना\n` +
              `• 💡 किसी नए विषय को वेबसाइट पर जुड़वाने के लिए फीडबैक देना\n\n` +
              `आज आप क्या पढ़ना या जानना चाहते हैं?`;
    } else if (lang === "hinglish") {
      reply = `Hello! 🙏 Main **Saarthi** hoon — Elite Exam Portal ka aapka personal AI Assistant.\n\n` +
              `Main aapki in baaton me help kar sakta hoon:\n` +
              `• 📚 Kisi bhi subject (DSA, OS, DBMS, Web, Python etc.) ke baare me janna\n` +
              `• 🚀 Website ko use karne aur test dene ka tarika samajhna\n` +
              `• 👨‍💻 Website ke creator **Sumit Dwivedi** ke bare me janna\n` +
              `• 💡 Agar koi subject nahi mila to use add karwane ke liye feedback dena\n\n` +
              `Bataiye, main aaj aapki kya help kar sakta hoon?`;
    } else {
      reply = `Hello! 🙏 I am **Saarthi**, your personal AI Academic Assistant on Elite Exam Portal.\n\n` +
              `I can assist you with:\n` +
              `• 📚 Understanding any CS subject (DSA, DBMS, OS, Networks, AI, Python, etc.)\n` +
              `• 🚀 Navigating the portal and taking practice tests\n` +
              `• 👨‍💻 Learning about the creator, **Sumit Dwivedi**\n` +
              `• 💡 Requesting new subjects to be added to the portal\n\n` +
              `How can I help you today?`;
    }
    return { reply, topic: "general", askedAboutOwner: false, courseRequested: "", language: lang };
  }

  // ── 7. FALLBACK / INTELLIGENT RESPONDER ──
  if (lang === "hindi") {
    reply = `मैं समझ गया! क्या आप किसी विषय (जैसे DSA, OS, DBMS, Python, AI) के बारे में जानना चाहते हैं, परीक्षा देना चाहते हैं, या पोर्टल के निर्माता **सुमित जी** के बारे में बात करना चाहते हैं? मुझे विस्तार से बताएं!`;
  } else if (lang === "hinglish") {
    reply = `Main samajh gaya! Aap kisi subject ke baare me janna chahte hain, test dena chahte hain, ya creator **Sumit Dwivedi** ke baare me janna chahte hain? Mujhe batayein, main aapko guide kar dunga!`;
  } else {
    reply = `I am here to help! Would you like information about an academic subject, guidance on using the exam portal, or details about the creator **Sumit Dwivedi**? Let me know!`;
  }

  return { reply, topic, askedAboutOwner, courseRequested: "", language: lang };
}

module.exports = {
  processSaarthiMessage,
  AVAILABLE_SUBJECTS,
  CREATOR_INFO
};
