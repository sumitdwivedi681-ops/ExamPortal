const https = require("https");

const WORKER_URL = "https://examportal.sumitdwivedi681.workers.dev/get-questions?course=React";
const TOTAL_REQUESTS = 10000;
const CONCURRENCY = 60;

// High performance native Node.js keep-alive agent
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 50,
  timeout: 15000,
});

function fetchWorker(url) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = https.get(url, { agent }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        const lat = performance.now() - start;
        const cacheStatus = res.headers["cf-cache-status"] || res.headers["x-cache"];
        resolve({
          statusCode: res.statusCode,
          latency: lat,
          isHit: cacheStatus === "HIT",
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.setTimeout(15000, () => {
      req.destroy(new Error("Timeout"));
    });
  });
}

async function runTest() {
  console.log(`\n======================================================`);
  console.log(`  10,000 REQUESTS LOAD TEST - CLOUDFLARE EDGE WORKER`);
  console.log(`  URL: ${WORKER_URL}`);
  console.log(`  Concurrency: ${CONCURRENCY} connections`);
  console.log(`======================================================\n`);

  let completed = 0;
  let success = 0;
  let hitCount = 0;
  let fail = 0;
  const latencies = [];
  const errors = {};

  const start = performance.now();
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < TOTAL_REQUESTS) {
      const idx = currentIndex++;
      try {
        const res = await fetchWorker(WORKER_URL);
        latencies.push(res.latency);
        completed++;
        if (res.statusCode >= 200 && res.statusCode < 300) {
          success++;
          if (res.isHit) hitCount++;
        } else {
          fail++;
          errors[`HTTP ${res.statusCode}`] = (errors[`HTTP ${res.statusCode}`] || 0) + 1;
        }
      } catch (err) {
        completed++;
        fail++;
        errors[err.message || "Error"] = (errors[err.message || "Error"] || 0) + 1;
      }

      if (completed % 1000 === 0 || completed === TOTAL_REQUESTS) {
        process.stdout.write(`Progress: ${completed}/${TOTAL_REQUESTS} (${((completed/TOTAL_REQUESTS)*100).toFixed(0)}%) - Success: ${success}, Fail: ${fail}\r`);
      }
    }
  }

  const pool = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    pool.push(worker());
  }

  await Promise.all(pool);
  const totalDuration = (performance.now() - start) / 1000;
  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  console.log(`\n\n======================================================`);
  console.log(`  FINAL 10K LOAD TEST REPORT`);
  console.log(`======================================================`);
  console.log(`  Total Requests   : ${completed}`);
  console.log(`  Success          : ${success} (${((success/completed)*100).toFixed(2)}%)`);
  console.log(`  Edge Cache Hits  : ${hitCount} (${((hitCount/completed)*100).toFixed(2)}%)`);
  console.log(`  Failed           : ${fail}`);
  console.log(`  Total Duration   : ${totalDuration.toFixed(2)} seconds`);
  console.log(`  Throughput       : ${(completed / totalDuration).toFixed(0)} req/second`);
  console.log(`------------------------------------------------------`);
  console.log(`  LATENCY:`);
  console.log(`    Min  : ${latencies[0] ? latencies[0].toFixed(0) : 0} ms`);
  console.log(`    Avg  : ${avg.toFixed(0)} ms`);
  console.log(`    P50  : ${p50.toFixed(0)} ms`);
  console.log(`    P90  : ${p90.toFixed(0)} ms`);
  console.log(`    P95  : ${p95.toFixed(0)} ms`);
  console.log(`    P99  : ${p99.toFixed(0)} ms`);
  console.log(`    Max  : ${latencies[latencies.length - 1] ? latencies[latencies.length - 1].toFixed(0) : 0} ms`);
  console.log(`======================================================\n`);

  if (Object.keys(errors).length > 0) {
    console.log(`Error breakdown:`, errors);
  }
}

runTest();
