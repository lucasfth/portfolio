// Compile-only contracts: these errors must remain visible in VSCode and typecheck.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";

const database = createClient<Database>("http://127.0.0.1:54321", "compile-only");

// @ts-expect-error Unknown tables must not typecheck.
database.from("game_scorez");
// @ts-expect-error Insert payloads must use real columns.
database.from("game_scores").insert({ nickname: "Lucas" });
// @ts-expect-error Field types must match Postgres types.
database.from("game_scores").update({ elapsed_ms: "fast" });
// @ts-expect-error RPC names must exist in the schema.
database.rpc("claim_game_runs", { p_run_id: "example-run" });
// @ts-expect-error RPC arguments must match the generated signature.
database.rpc("claim_game_run", { runId: "example-run" });

async function checkSelectedColumns() {
  const { data } = await database.from("game_scores").select("display_nickname, elapsed_ms");
  if (data) {
    data[0].display_nickname satisfies string;
    data[0].elapsed_ms satisfies number;
    // @ts-expect-error Fields omitted from the selection must not be accessible.
    data[0].created_at;
  }
}
void checkSelectedColumns;
