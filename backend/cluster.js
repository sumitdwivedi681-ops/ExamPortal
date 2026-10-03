/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║         ExamPortal — Cluster Mode Entry Point            ║
 * ║  Spawns one worker per CPU core for maximum throughput   ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const cluster = require("cluster");
const os = require("os");
const path = require("path");

const NUM_WORKERS = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`\n🚀 ExamPortal Master Process [PID: ${process.pid}]`);
  console.log(`🧠 Spawning ${NUM_WORKERS} workers (one per CPU core)...\n`);

  // Fork one worker per CPU core
  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  // Auto-restart crashed workers
  cluster.on("exit", (worker, code, signal) => {
    console.warn(`⚠️  Worker ${worker.process.pid} died (code: ${code}). Restarting...`);
    cluster.fork();
  });

  cluster.on("online", (worker) => {
    console.log(`✅ Worker ${worker.process.pid} is online`);
  });

} else {
  // Each worker runs the actual server
  require("./server.js");
}
