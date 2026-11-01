/**
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║                  EXAMPORTAL SECURITY FIREWALL (WAF)                    ║
 * ║  Enterprise-grade Web Application Firewall & Threat Protection Shield ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 */

// ── In-Memory Security Threat Log & IP Jail Tracker ────────────────────────
const firewallStats = {
  totalBlocked: 0,
  threatsByType: {
    BAD_BOT: 0,
    HTTP_METHOD: 0,
    PROTOTYPE_POLLUTION: 0,
    NOSQL_INJECTION: 0,
    PATH_TRAVERSAL: 0,
    XSS_ATTACK: 0,
    COMMAND_INJECTION: 0,
    JAILED_IP: 0
  },
  recentThreats: []
};

// IP Jail: Map of IP -> { count, jailUntil }
const ipViolationMap = new Map();
const JAILED_IPS = new Set();
const VIOLATION_THRESHOLD = 5;      // Max violations before 15-minute ban
const JAIL_DURATION_MS = 15 * 60 * 1000; // 15 Minutes
const VIOLATION_WINDOW_MS = 10 * 60 * 1000; // 10 Minutes

// Periodically clean up expired jails and violation records
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipViolationMap.entries()) {
    if (now > record.resetAt && now > record.jailUntil) {
      ipViolationMap.delete(ip);
      JAILED_IPS.delete(ip);
    }
  }
}, 2 * 60 * 1000);

// Known hostile vulnerability scanners, exploit scrapers & bad bots
const BAD_BOT_SIGNATURES = [
  /sqlmap/i,
  /nikto/i,
  /acunetix/i,
  /nessus/i,
  /wpscan/i,
  /masscan/i,
  /zgrab/i,
  /gobuster/i,
  /dirbuster/i,
  /havij/i,
  /openvas/i,
  /qualys/i,
  /pangolin/i,
  /commix/i
];

// Dangerous HTTP methods
const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"]);

// Path Traversal / LFI signatures
const PATH_TRAVERSAL_PATTERN = /(\.\.[\/\\]|%2e%2e[\/\\]|\/etc\/passwd|win\.ini|\/proc\/self|\/boot\.ini)/i;

// Command Injection signatures
const CMD_INJECTION_PATTERN = /(;\s*(?:rm\s+-rf|cat\s+\/etc|whoami|net\s+user|powershell\s+-enc)|\|\s*(?:bash|sh|cmd|whoami)|\$\(nc\s+-e)/i;

// Cross-Site Scripting (XSS) signatures for URL parameters and queries
const XSS_PATTERN = /(<script[\s\S]*?>|javascript:\s*|vbscript:\s*|<iframe[\s\S]*?>|onload\s*=|onerror\s*=|onclick\s*=|document\.cookie|window\.location|<\s*svg[^>]*onload)/i;

// MongoDB NoSQL Operator Injection patterns in keys
const MONGO_OPERATOR_PATTERN = /^\$(where|gt|gte|lt|lte|ne|nin|in|regex|expr|jsonSchema|mod|text|where|exists|type)$/i;

/**
 * Checks an object recursively for MongoDB operator injection ($gt, $ne, etc. as keys)
 * or Prototype Pollution (__proto__, constructor.prototype).
 */
function inspectObjectDeep(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 8) return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const threat = inspectObjectDeep(item, depth + 1);
      if (threat) return threat;
    }
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(obj, "__proto__")) {
    return { type: "PROTOTYPE_POLLUTION", detail: "Attempt to pollute prototype via __proto__" };
  }

  // Detect prototype tampering where prototype is not Object.prototype or null
  const proto = Object.getPrototypeOf(obj);
  if (proto !== Object.prototype && proto !== null && !Array.isArray(obj)) {
    return { type: "PROTOTYPE_POLLUTION", detail: "Prototype pollution attempt detected via altered object prototype" };
  }

  for (const key of Object.getOwnPropertyNames(obj)) {
    // 1. Prototype Pollution
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return { type: "PROTOTYPE_POLLUTION", detail: `Attempt to pollute prototype via key "${key}"` };
    }

    // 2. MongoDB operator as an object key (NoSQL Injection)
    if (MONGO_OPERATOR_PATTERN.test(key)) {
      return { type: "NOSQL_INJECTION", detail: `MongoDB operator injection detected: "${key}"` };
    }

    const val = obj[key];
    if (typeof val === "object" && val !== null) {
      const threat = inspectObjectDeep(val, depth + 1);
      if (threat) return threat;
    }
  }

  return null;
}

/**
 * Record a security threat and check whether the IP should be jailed
 */
function recordThreat(ip, threatType, req, detail = "") {
  firewallStats.totalBlocked++;
  if (firewallStats.threatsByType[threatType] !== undefined) {
    firewallStats.threatsByType[threatType]++;
  }

  const now = Date.now();
  let record = ipViolationMap.get(ip);
  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + VIOLATION_WINDOW_MS, jailUntil: 0 };
  } else {
    record.count++;
  }

  if (record.count >= VIOLATION_THRESHOLD) {
    record.jailUntil = now + JAIL_DURATION_MS;
    JAILED_IPS.add(ip);
    console.warn(`🚨 [FIREWALL JAIL] IP ${ip} has been BANNED for 15 minutes due to repeated security violations.`);
  }
  ipViolationMap.set(ip, record);

  // Store in circular buffer (last 50 events)
  firewallStats.recentThreats.unshift({
    timestamp: new Date().toISOString(),
    ip,
    threatType,
    method: req.method,
    path: req.originalUrl || req.url,
    detail
  });
  if (firewallStats.recentThreats.length > 50) {
    firewallStats.recentThreats.pop();
  }

  console.warn(`🛡️ [FIREWALL BLOCKED] ${threatType} from IP: ${ip} | ${req.method} ${req.originalUrl || req.url} | Detail: ${detail}`);
}

/**
 * Main Express Firewall Middleware
 */
function firewallMiddleware(req, res, next) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();

  // Attach standard security headers
  res.setHeader("X-Firewall", "ExamPortal-WAF-Active");
  res.setHeader("X-Protected-By", "ExamPortal-Security-Shield");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // 1. IP Jail Check — Instant reject if banned
  const now = Date.now();
  const record = ipViolationMap.get(ip);
  if (record && record.jailUntil > now) {
    firewallStats.threatsByType.JAILED_IP++;
    res.setHeader("X-Firewall-Status", "BLOCKED-IP-JAILED");
    return res.status(403).json({
      error: "Forbidden: Your IP address has been temporarily blocked by the ExamPortal Security Firewall due to repeated malicious activity.",
      retryAfterSeconds: Math.ceil((record.jailUntil - now) / 1000)
    });
  }

  // 2. HTTP Method Inspection
  if (!ALLOWED_METHODS.has(req.method.toUpperCase())) {
    recordThreat(ip, "HTTP_METHOD", req, `Unsupported or dangerous HTTP method: ${req.method}`);
    return res.status(405).json({ error: "Method Not Allowed: Request method rejected by firewall." });
  }

  // 3. Bad Bot / Vulnerability Scanner Inspection
  const userAgent = String(req.headers["user-agent"] || "");
  for (const botPattern of BAD_BOT_SIGNATURES) {
    if (botPattern.test(userAgent)) {
      recordThreat(ip, "BAD_BOT", req, `Vulnerability scanner bot detected: ${userAgent}`);
      return res.status(403).json({ error: "Access Denied: Malicious scanner activity detected by security firewall." });
    }
  }

  // 4. Path Traversal & LFI Inspection in URL and Path
  const fullUrl = req.originalUrl || req.url || "";
  let decodedUrl = fullUrl;
  try {
    decodedUrl = decodeURIComponent(fullUrl);
  } catch (e) {
    // Malformed URI encoding
  }

  if (PATH_TRAVERSAL_PATTERN.test(decodedUrl)) {
    recordThreat(ip, "PATH_TRAVERSAL", req, `Directory traversal in URL: ${decodedUrl}`);
    return res.status(400).json({ error: "Bad Request: Path traversal payload rejected by firewall." });
  }

  // 5. Command Injection Inspection in URL
  if (CMD_INJECTION_PATTERN.test(decodedUrl)) {
    recordThreat(ip, "COMMAND_INJECTION", req, `Command injection detected in URL: ${decodedUrl}`);
    return res.status(400).json({ error: "Bad Request: Remote command injection blocked by firewall." });
  }

  // 6. XSS Injection Inspection in URL & Query Parameters
  if (XSS_PATTERN.test(decodedUrl)) {
    recordThreat(ip, "XSS_ATTACK", req, `Cross-site scripting attempt in URL: ${decodedUrl}`);
    return res.status(400).json({ error: "Bad Request: Malicious script injection rejected by firewall." });
  }

  // 7. Query Parameter Deep Inspection
  if (req.query && typeof req.query === "object") {
    const threat = inspectObjectDeep(req.query);
    if (threat) {
      recordThreat(ip, threat.type, req, threat.detail);
      return res.status(400).json({ error: `Security Violation: ${threat.detail}` });
    }
  }

  // 8. Request Body Inspection (NoSQL Operator Injections & Prototype Pollution)
  // Exempt bulk questions data since question text can contain programming questions (e.g. "What does $regex mean in MongoDB?")
  const isQuestionBulkUpload = req.path === "/admin/questions/bulk";
  if (req.body && typeof req.body === "object" && !isQuestionBulkUpload) {
    const threat = inspectObjectDeep(req.body);
    if (threat) {
      recordThreat(ip, threat.type, req, threat.detail);
      return res.status(400).json({ error: `Security Violation: ${threat.detail}` });
    }
  }

  // Passed all firewall checks!
  next();
}

/**
 * Get live stats and threat history for Admin Dashboard
 */
function getFirewallStats() {
  return {
    status: "active",
    totalBlocked: firewallStats.totalBlocked,
    activeJailedIPs: JAILED_IPS.size,
    threatsByType: { ...firewallStats.threatsByType },
    recentThreats: [...firewallStats.recentThreats]
  };
}

module.exports = {
  firewallMiddleware,
  getFirewallStats
};
