const WORKER_URL = "https://examportal.sumitdwivedi681.workers.dev/get-questions?course=React";
const TOTAL_REQUESTS = 10000;
const CONCURRENCY = 100;

async function testWorker() {
  console.log(`Starting test: ${TOTAL_REQUESTS} requests to Cloudflare Worker (Concurrency: ${CONCURRENCY})...`);
  let completed = 0;
  let success = 0;
  let hitCount = 0;
  let fail = 0;
  let latencies = [];

  const start = performance.now();
  let currentIndex = 0;

  async function workerTask() {
    while (currentIndex < TOTAL_REQUESTS) {
      const idx = currentIndex++;
      const reqStart = performance.now();
      try {
        const res = await fetch(WORKER_URL, {
          signal: AbortSignal.timeout(10000)
        });
        const lat = performance.now() - reqStart;
        latencies.push(lat);
        completed++;
        if (res.ok) {
          success++;
          if (res.headers.get("cf-cache-status") === "HIT" || res.headers.get("x-cache") === "HIT") {
            hitCount++;
          }
        } else {
          fail++;
        }
      } catch (err) {
        completed++;
        fail++;
      }
    }
  }

  const pool = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    pool.push(workerTask());
  }

  await Promise.all(pool);
  const totalDuration = (performance.now() - start) / 1000;
  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;

  console.log(`\n========================================`);
  console.log(`  Cloudflare Edge Worker Results`);
  console.log(`========================================`);
  console.log(`  Total Requests : ${completed}`);
  console.log(`  Successful     : ${success} (${((success/completed)*100).toFixed(1)}%)`);
  console.log(`  Cache Hits     : ${hitCount} (${((hitCount/completed)*100).toFixed(1)}%)`);
  console.log(`  Failed         : ${fail}`);
  console.log(`  Total Time     : ${totalDuration.toFixed(2)}s`);
  console.log(`  Throughput     : ${(completed / totalDuration).toFixed(0)} req/sec`);
  console.log(`  Avg Latency    : ${avg.toFixed(0)}ms`);
  console.log(`  P50 Latency    : ${p50.toFixed(0)}ms`);
  console.log(`  P95 Latency    : ${p95.toFixed(0)}ms`);
  console.log(`========================================\n`);
}

testWorker();
