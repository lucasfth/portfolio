import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error(
      "DATABASE_URL is required. Use an explicit local test database, for example: " +
        "DATABASE_URL='postgres:///portfolio_supabase_test?host=/tmp' node supabase/tests/concurrency.mjs",
    );
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL must be a PostgreSQL URL for a local test database.");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres: or postgresql: scheme.");
  }

  const host = url.hostname || url.searchParams.get("host") || "";
  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(host.toLowerCase());
  const isUnixSocket = host.startsWith("/");
  if (!isLoopback && !isUnixSocket) {
    throw new Error("Refusing to run database concurrency tests unless DATABASE_URL targets a local PostgreSQL host or Unix socket.");
  }
  return value;
}

const connectionString = databaseUrl();
const psqlArgs = ["-X", "-v", "ON_ERROR_STOP=1", "-d", connectionString];

function runPsql(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn("psql", [...psqlArgs, "-qAt"], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`psql exited with status ${code}: ${stderr.trim()}`));
    });
    child.stdin.end(sql + "\n");
  });
}

function startPsql() {
  const child = spawn("psql", [...psqlArgs, "-qAt"], { stdio: ["pipe", "pipe", "pipe"] });
  const session = { child, stdout: "", stderr: "", waiters: [] };
  session.exit = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`psql exited with status ${code}: ${session.stderr.trim()}`));
    });
  });
  child.stdout.setEncoding("utf8").on("data", (chunk) => {
    session.stdout += chunk;
    session.waiters = session.waiters.filter(({ marker, resolve }) => {
      if (!session.stdout.includes(marker)) return true;
      resolve();
      return false;
    });
  });
  child.stderr.setEncoding("utf8").on("data", (chunk) => (session.stderr += chunk));
  session.waitFor = (marker) => {
    if (session.stdout.includes(marker)) return Promise.resolve();
    return new Promise((resolve) => session.waiters.push({ marker, resolve }));
  };
  return session;
}

function values(session) {
  return session.stdout.split(/\r?\n/).map((line) => line.trim()).filter((line) => line === "t" || line === "f");
}

async function waitForAdvisoryWaiters(key, expected) {
  const high = Number((key >> 32n) & 0xffffffffn);
  const low = Number(key & 0xffffffffn);
  const query = `SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND NOT granted AND classid = ${high}::oid AND objid = ${low}::oid AND objsubid = 1`;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const count = Number(await runPsql(query));
    if (count === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${expected} concurrent PostgreSQL sessions at the advisory-lock barrier.`);
}

async function runTogether(statements) {
  const lockKey = BigInt(`0x${randomUUID().replaceAll("-", "").slice(0, 15)}`);
  const coordinator = startPsql();
  const workers = [];
  try {
    coordinator.child.stdin.write(`BEGIN;\nSELECT pg_advisory_xact_lock(${lockKey});\n\\echo BARRIER_HELD\n`);
    await coordinator.waitFor("BARRIER_HELD");

    for (const statement of statements) {
      const worker = startPsql();
      workers.push(worker);
      worker.child.stdin.end(
        `BEGIN;\nSELECT pg_advisory_xact_lock_shared(${lockKey});\nSET ROLE service_role;\n${statement}\nCOMMIT;\n`,
      );
    }

    await waitForAdvisoryWaiters(lockKey, workers.length);
    coordinator.child.stdin.end("COMMIT;\n\\q\n");
    await Promise.all([coordinator.exit, ...workers.map((worker) => worker.exit)]);
    return workers;
  } catch (error) {
    coordinator.child.kill("SIGTERM");
    for (const worker of workers) worker.child.kill("SIGTERM");
    await Promise.allSettled([coordinator.exit, ...workers.map((worker) => worker.exit)]);
    throw error;
  }
}

const suffix = randomUUID().replaceAll("-", "");
const claimRunId = `dc-claim-${suffix}`;
const scoreRunIds = [`dc-score-a-${suffix}`, `dc-score-b-${suffix}`];
const nickname = `dc-${suffix.slice(0, 20)}`;
let testDate;

try {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const date = await runPsql(
      `SET ROLE service_role; SELECT (DATE '2070-01-01' + ${attempt})::text`,
    );
    const available = await runPsql(
      `SET ROLE service_role; SELECT NOT EXISTS (SELECT 1 FROM public.game_scores WHERE date = '${date}'::date)`,
    );
    if (available === "t") {
      testDate = date;
      break;
    }
  }
  assert.ok(testDate, "could not find an unused date for isolated concurrency rows");

  const setup = await runPsql(
    `SET ROLE service_role; SELECT public.claim_game_run('${scoreRunIds[0]}'); SELECT public.claim_game_run('${scoreRunIds[1]}')`,
  );
  assert.deepEqual(setup.split(/\r?\n/), ["t", "t"], "score writes must each use a distinct claimed run");

  const claimWorkers = await runTogether([
    `SELECT public.claim_game_run('${claimRunId}');`,
    `SELECT public.claim_game_run('${claimRunId}');`,
  ]);
  assert.deepEqual(
    claimWorkers.flatMap(values).sort(),
    ["f", "t"],
    "exactly one of two simultaneous claims for the same run must win",
  );

  await runTogether([
    `SELECT public.save_game_best_score('${scoreRunIds[0]}', '${testDate}', '${nickname}', '${nickname}', 20, 6000);`,
    `SELECT public.save_game_best_score('${scoreRunIds[1]}', '${testDate}', '${nickname}', '${nickname}', 20, 4000);`,
  ]);
  const finalScore = await runPsql(
    `SET ROLE service_role; SELECT level::text || ':' || elapsed_ms::text FROM public.game_scores WHERE date = '${testDate}'::date AND normalized_nickname = '${nickname}'`,
  );
  assert.equal(finalScore, "20:4000", "simultaneous writes must preserve the best score for the nickname");

  console.log("Database concurrency checks passed: one run claim wins; best concurrent score is retained.");
} finally {
  if (testDate) {
    await runPsql(
      `BEGIN; DELETE FROM public.game_scores WHERE date = '${testDate}'::date AND normalized_nickname = '${nickname}'; DELETE FROM public.game_used_runs WHERE run_id IN ('${claimRunId}', '${scoreRunIds[0]}', '${scoreRunIds[1]}'); COMMIT;`,
    );
    const remaining = await runPsql(
      `SET ROLE service_role; SELECT (SELECT count(*) FROM public.game_scores WHERE date = '${testDate}'::date AND normalized_nickname = '${nickname}') + (SELECT count(*) FROM public.game_used_runs WHERE run_id IN ('${claimRunId}', '${scoreRunIds[0]}', '${scoreRunIds[1]}'))`,
    );
    assert.equal(remaining, "0", "test cleanup must remove only this run's score and claim records");
  }
}
