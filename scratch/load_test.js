/**
 * ExamPortal Load Test - 500 Simultaneous Requests
 * Tests all major API endpoints concurrently
 */

const BASE_URL = "https://examportal-backend-fakr.onrender.com";
const WORKER_URL = "https://examportal.sumitdwivedi681.workers.dev";
const TOTAL_REQUESTS = 10000;

// ─── Color helpers ─────────────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

// ─── Endpoints to test ─────────────────────────────────────────────────────────
const ENDPOINTS = [
  { method: "GET",  path: "/ping",                       weight: 100, label: "Health Check (/ping)" },
  { method: "GET",  path: "/get-questions?course=React",  weight: 150, label: "Get Questions (React)" },
  { method: "GET",  path: "/get-questions?course=Node",   weight: 100, label: "Get Questions (Node)" },
  { method: "GET",  path: "/get-questions?course=JS",     weight: 100, label: "Get Questions (JS)" },
  { method: "POST", path: "/login",                       weight: 50,
    body: { email: "test@test.com", password: "wrongpassword" },
    label: "Login (invalid cred)" },
  { method: "POST", path: "/admin/login",                 weight: 50,
    body: { password: "wrongpassword" },
    label: "Admin Login (invalid)" },
];

// ─── Statistics tracker ─────────────────────────────────────────────────────────
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  byEndpoint: {},
  latencies: [],
  errors: [],
  statusCodes: {},
};

// ─── Build 500-request queue from weighted endpoints ───────────────────────────
function buildRequestQueue() {
  const totalWeight = ENDPOINTS.reduce((s, e) => s + e.weight, 0);
  const queue = [];

  for (const ep of ENDPOINTS) {
    const count = Math.round((ep.weight / totalWeight) * TOTAL_REQUESTS);
    for (let i = 0; i < count; i++) queue.push(ep);
  }

  // Fill up to exactly 500 with the heaviest endpoint
  while (queue.length < TOTAL_REQUESTS) queue.push(ENDPOINTS[0]);
  while (queue.length > TOTAL_REQUESTS) queue.pop();

  // Shuffle
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  return queue;
}

// ─── Single request with timing ────────────────────────────────────────────────
async function makeRequest(ep, index) {
  const origin = ep.path.startsWith("/get-questions") ? WORKER_URL : BASE_URL;
  const url = `${origin}${ep.path}`;
  const opts = {
    method: ep.method,
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
  };
  if (ep.body) opts.body = JSON.stringify(ep.body);

  const start = performance.now();
  try {
    const res = await fetch(url, opts);
    const latency = performance.now() - start;

    stats.total++;
    stats.latencies.push(latency);
    stats.statusCodes[res.status] = (stats.statusCodes[res.status] || 0) + 1;

    if (!stats.byEndpoint[ep.label]) {
      stats.byEndpoint[ep.label] = { count: 0, success: 0, failed: 0, totalMs: 0 };
    }
    stats.byEndpoint[ep.label].count++;
    stats.byEndpoint[ep.label].totalMs += latency;

    if (res.ok || res.status === 400 || res.status === 401 || res.status === 404) {
      stats.success++;
      stats.byEndpoint[ep.label].success++;
    } else {
      stats.failed++;
      stats.byEndpoint[ep.label].failed++;
    }

    return { status: res.status, latency };
  } catch (err) {
    const latency = performance.now() - start;
    stats.total++;
    stats.failed++;
    stats.errors.push({ endpoint: ep.label, error: err.message });
    stats.latencies.push(latency);

    if (!stats.byEndpoint[ep.label]) {
      stats.byEndpoint[ep.label] = { count: 0, success: 0, failed: 0, totalMs: 0 };
    }
    stats.byEndpoint[ep.label].count++;
    stats.byEndpoint[ep.label].failed++;
    stats.byEndpoint[ep.label].totalMs += latency;

    return { status: "ERROR", latency, error: err.message };
  }
}

// ─── Progress bar ───────────────────────────────────────────────────────────────
function progressBar(done, total, width = 40) {
  const pct = done / total;
  const filled = Math.round(pct * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  return `[${bar}] ${done}/${total} (${(pct * 100).toFixed(1)}%)`;
}

// ─── Print final report ────────────────────────────────────────────────────────
function printReport(durationMs) {
  const lats = stats.latencies.sort((a, b) => a - b);
  const avg = lats.reduce((s, v) => s + v, 0) / lats.length;
  const p50 = lats[Math.floor(lats.length * 0.50)];
  const p90 = lats[Math.floor(lats.length * 0.90)];
  const p95 = lats[Math.floor(lats.length * 0.95)];
  const p99 = lats[Math.floor(lats.length * 0.99)];
  const min  = lats[0];
  const max  = lats[lats.length - 1];
  const rps  = (stats.total / (durationMs / 1000)).toFixed(2);
  const successRate = ((stats.success / stats.total) * 100).toFixed(2);

  console.log("\n");
  console.log(`${C.bold}${C.cyan}${"=".repeat(62)}${C.reset}`);
  console.log(`${C.bold}${C.cyan}   ExamPortal Load Test - Final Report${C.reset}`);
  console.log(`${C.bold}${C.cyan}${"=".repeat(62)}${C.reset}`);

  console.log(`\n${C.bold}SUMMARY${C.reset}`);
  console.log(`  Total Requests   : ${C.bold}${stats.total}${C.reset}`);
  console.log(`  Success          : ${C.green}${stats.success}${C.reset}`);
  console.log(`  Failed           : ${C.red}${stats.failed}${C.reset}`);
  console.log(`  Success Rate     : ${successRate >= 95 ? C.green : C.red}${successRate}%${C.reset}`);
  console.log(`  Duration         : ${(durationMs / 1000).toFixed(2)}s`);
  console.log(`  Throughput       : ${C.bold}${rps} req/s${C.reset}`);

  console.log(`\n${C.bold}LATENCY (ms)${C.reset}`);
  console.log(`  Min    : ${min.toFixed(0)} ms`);
  console.log(`  Avg    : ${avg.toFixed(0)} ms`);
  console.log(`  P50    : ${p50.toFixed(0)} ms`);
  console.log(`  P90    : ${p90.toFixed(0)} ms`);
  console.log(`  P95    : ${p95.toFixed(0)} ms`);
  console.log(`  P99    : ${p99.toFixed(0)} ms`);
  console.log(`  Max    : ${max.toFixed(0)} ms`);

  console.log(`\n${C.bold}HTTP STATUS CODES${C.reset}`);
  for (const [code, count] of Object.entries(stats.statusCodes).sort()) {
    const bar = "=".repeat(Math.min(30, Math.round((count / stats.total) * 30)));
    const color = code >= 500 ? C.red : code >= 400 ? C.yellow : C.green;
    console.log(`  ${color}${code}${C.reset}  ${bar} ${count}`);
  }

  console.log(`\n${C.bold}PER ENDPOINT BREAKDOWN${C.reset}`);
  console.log(`  ${"Endpoint".padEnd(32)} ${"Req".padStart(5)} ${"OK".padStart(5)} ${"Fail".padStart(5)} ${"Avg ms".padStart(8)}`);
  console.log(`  ${"-".repeat(60)}`);
  for (const [label, ep] of Object.entries(stats.byEndpoint)) {
    const avgMs = (ep.totalMs / ep.count).toFixed(0);
    const failColor = ep.failed > 0 ? C.red : C.green;
    console.log(
      `  ${label.padEnd(32)} ${String(ep.count).padStart(5)} ${C.green}${String(ep.success).padStart(5)}${C.reset} ${failColor}${String(ep.failed).padStart(5)}${C.reset} ${avgMs.padStart(8)}`
    );
  }

  if (stats.errors.length > 0) {
    const sample = stats.errors.slice(0, 10);
    console.log(`\n${C.bold}${C.red}SAMPLE ERRORS (first 10)${C.reset}`);
    for (const e of sample) {
      console.log(`  [${e.endpoint}] ${e.error}`);
    }
  }

  console.log(`\n${C.bold}${C.cyan}${"=".repeat(62)}${C.reset}`);

  if (successRate >= 95) {
    console.log(`\n${C.bold}${C.green}PASSED - Server handled 500 concurrent requests well!${C.reset}`);
  } else if (successRate >= 80) {
    console.log(`\n${C.bold}${C.yellow}PARTIAL - Server struggled under load (${successRate}% success).${C.reset}`);
  } else {
    console.log(`\n${C.bold}${C.red}FAILED - Server could not handle 500 concurrent requests (${successRate}% success).${C.reset}`);
  }
  console.log();
}

// ─── Warm-up: wake the server before load test ────────────────────────────────
async function warmUp() {
  console.log(`${C.bold}${C.yellow}[1/2] Warming up server (waking from cold start)...${C.reset}`);
  const warmStart = performance.now();

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/ping`, {
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const ms = (performance.now() - warmStart).toFixed(0);
        console.log(`${C.green}      Server awake! Warm-up took ${ms}ms (attempt ${attempt})${C.reset}`);
        // Give it 1 extra second to fully stabilize
        await new Promise((r) => setTimeout(r, 1000));
        return true;
      }
    } catch {
      process.stdout.write(`\r      Attempt ${attempt}/10 — waiting...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.log(`\n${C.red}      Server did not respond after warm-up attempts. Aborting.${C.reset}`);
  return false;
}

// ─── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.magenta}ExamPortal Load Tester — 500 Simultaneous Requests${C.reset}`);
  console.log(`${C.dim}Target : ${BASE_URL}${C.reset}\n`);

  const ready = await warmUp();
  if (!ready) process.exit(1);

  console.log(`\n${C.bold}${C.yellow}[2/2] Firing 500 simultaneous requests NOW...${C.reset}\n`);

  const queue = buildRequestQueue();
  let completed = 0;

  process.stdout.write(`  ${progressBar(0, TOTAL_REQUESTS)}\r`);

  const start = performance.now();

  // Fire ALL 500 requests at once
  const promises = queue.map((ep) =>
    makeRequest(ep).then((result) => {
      completed++;
      process.stdout.write(`  ${progressBar(completed, TOTAL_REQUESTS)}\r`);
      return result;
    })
  );

  await Promise.allSettled(promises);

  const duration = performance.now() - start;
  process.stdout.write(`  ${progressBar(TOTAL_REQUESTS, TOTAL_REQUESTS)}\n`);

  printReport(duration);
}

main().catch(console.error);
