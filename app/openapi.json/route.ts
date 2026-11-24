/**
 * Generated once and served at /openapi.json. Keep it in sync with the
 * live API by hand — the routes here are small and stable.
 */
const spec = {
  openapi: "3.1.1",
  info: {
    title: "Lucas Hanson public portfolio API",
    version: "1.0.0",
    description: [
      "Public, read-only interfaces for the portfolio site.",
      "",
      "Access: every operation below is free and requires no API key, account, or authentication; there is no separate sandbox or test environment — the public endpoints are the live service and all read operations work as-is. The only paid action on the site is the optional x402 leaderboard entry made by a non-browser agent (HTTP 402), documented on the `post` of `/api/game/scores`.",
      "",
      "Errors: REST endpoints answer `{ \"error\": { \"code\", \"message\" } }` (see `ApiError`). The Damage Control game endpoints answer the flat shape `{ \"error\": \"<code>\", \"message\": ..., ...details }` (see `GameError`). Every 4xx and 5xx response carries a machine-readable code.",
    ].join("\n"),
  },
  servers: [{ url: "https://lucashanson.dk" }],
  tags: [
    { name: "search", description: "Search public pages." },
    { name: "markdown", description: "Pages as Markdown." },
    { name: "games", description: "Damage Control, the sentence game." },
  ],
  paths: {
    "/api/search": {
      get: {
        tags: ["search"],
        operationId: "searchContent",
        summary: "Search public pages",
        description: "Full-text search over public pages. Returns up to 30 results, each with a title, description and URL.",
        responses: {
          "200": {
            description: "Matching pages.",
            headers: {
              "Cache-Control": { description: "Public, cached for one hour.", schema: { type: "string" } },
            },
            content: {
              "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/SearchItem" } } },
            },
          },
          "405": {
            description: "This endpoint only supports GET.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/MethodNotAllowed" } } },
          },
        },
      },
    },
    "/api/gallery-preview": {
      get: {
        tags: ["search"],
        operationId: "getGalleryPreview",
        summary: "Get a gallery preview",
        description: "Returns the preview images for one Aperture gallery by id.",
        parameters: [
          {
            name: "id",
            in: "query",
            required: true,
            description: "Gallery id, for example \"aperture-seven\".",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "The gallery preview images.",
            headers: {
              "Cache-Control": { description: "Public, cached for one hour.", schema: { type: "string" } },
            },
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/GalleryPreviewImage" } },
              },
            },
          },
          "404": {
            description: "No gallery with that id.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GalleryNotFound" } } },
          },
          "405": {
            description: "This endpoint only supports GET.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/MethodNotAllowed" } } },
          },
        },
      },
    },
    "/api/markdown": {
      get: {
        tags: ["markdown"],
        operationId: "getPageAsMarkdown",
        summary: "Get a page as Markdown",
        description: "Returns one public page as clean Markdown. The 404 body is Markdown with discovery links too.",
        parameters: [
          {
            name: "path",
            in: "query",
            required: true,
            description: "Site path of the page, for example \"/about\" or \"/blog/self-hosted-ai-agents\".",
            schema: { type: "string", pattern: "^/" },
          },
        ],
        responses: {
          "200": {
            description: "The page as clean Markdown.",
            content: {
              "text/markdown": { schema: { type: "string", description: "The page body as Markdown." } },
            },
          },
          "404": {
            description: "No such page.",
            content: {
              "text/markdown": { schema: { type: "string", description: "Markdown 404 with discovery links." } },
            },
          },
          "405": {
            description: "This endpoint only supports GET.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/MethodNotAllowed" } } },
          },
        },
      },
    },
    "/api/game/challenge": {
      get: {
        tags: ["games"],
        operationId: "getGameChallenge",
        summary: "Get the current game challenge",
        description:
          "Today's date, the 5-minute time bucket, all 20 rule descriptions in order, when the bucket changes, and the agent guide URL. Rules 1 to 4 follow the UTC clock; rules 5 to 8 rotate daily.",
        responses: {
          "200": {
            description: "The current challenge.",
            headers: { "Cache-Control": { description: "no-store", schema: { type: "string" } } },
            content: { "application/json": { schema: { $ref: "#/components/schemas/ChallengeResponse" } } },
          },
        },
      },
    },
    "/api/game/play": {
      post: {
        tags: ["games"],
        operationId: "playGameStep",
        summary: "Start a run or clear the next rule",
        description:
          "Send an empty JSON object to start a run. Send `{ \"token\", \"sentence\" }` to try clearing the next rule. Every earlier rule is re-checked on the server clock, so progress cannot be forged. Playing is free.",
        requestBody: {
          required: false,
          description: "Omit the body (or send `{}`) to start a run.",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RunStep" } },
          },
        },
        responses: {
          "200": {
            description: "The run state: a fresh signed token, the number of cleared rules and what plays next.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/RunState" } } },
          },
          "400": {
            description: "Malformed JSON body, or a run token that is invalid or expired.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameError" } } },
          },
          "409": {
            description: "The run already cleared all 20 rules; submit it to `/api/game/scores`.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameError" } } },
          },
          "413": {
            description: "Request body larger than 4096 bytes.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameError" } } },
          },
          "422": {
            description:
              "The sentence failed a rule (`failedRuleIds`), contains made-up words (`misspelled_words` with a `misspelled` list), or is not grammatical English (`not_a_sentence`).",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameError" } } },
          },
          "429": {
            description: "Cleared faster than one rule per second; wait `retryAfterMs`.",
            headers: { "Retry-After": { description: "Seconds to wait.", schema: { type: "number" } } },
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameError" } } },
          },
          "503": {
            description: "Game server not set up yet.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameError" } } },
          },
        },
      },
    },
    "/api/game/leaderboard": {
      get: {
        tags: ["games"],
        operationId: "getGameLeaderboard",
        summary: "Get the day's leaderboard",
        description: "Top 50 finished runs for a UTC date (defaults to today).",
        parameters: [
          {
            name: "date",
            in: "query",
            required: false,
            description: "UTC date in YYYY-MM-DD form; defaults to today.",
            schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          },
        ],
        responses: {
          "200": {
            description: "The leaderboard for the date.",
            headers: { "Cache-Control": { description: "s-maxage=30", schema: { type: "string" } } },
            content: { "application/json": { schema: { $ref: "#/components/schemas/Leaderboard" } } },
          },
          "400": {
            description: "Not a real UTC date.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameError" } } },
          },
          "503": {
            description: "Leaderboard not set up yet or temporarily unavailable.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameError" } } },
          },
        },
      },
    },
    "/api/game/scores": {
      post: {
        tags: ["games"],
        operationId: "submitGameScore",
        summary: "Submit a finished run",
        description:
          "Submits a run that cleared all 20 rules. A browser session that passes the site's invisible bot check saves free; every other client receives HTTP 402 with x402 v2 payment terms in the body and the `PAYMENT-REQUIRED` header, then retries with a `PAYMENT-SIGNATURE` header that accepts those exact terms. Each run can be submitted once.",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ScoreInput" } },
          },
        },
        responses: {
          "200": {
            description: "The saved score and its rank. For a paid entry, the settlement comes back base64-encoded in the `PAYMENT-RESPONSE` header.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ScoreEntry" } } },
          },
          "400": {
            description: "Malformed JSON, invalid or incomplete run, or an invalid nickname.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameError" } } },
          },
          "402": {
            description: "Agent leaderboard entry: x402 v2 payment required.",
            headers: {
              "PAYMENT-REQUIRED": {
                description: "The same payment body, base64-encoded.",
                schema: { type: "string" },
              },
              Link: {
                description: "The donation page as rel=\"payment\".",
                schema: { type: "string" },
              },
            },
            content: { "application/json": { schema: { $ref: "#/components/schemas/X402PaymentRequired" } } },
          },
          "409": {
            description: "This run was already submitted.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameError" } } },
          },
          "413": {
            description: "Request body larger than 4096 bytes.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameError" } } },
          },
          "422": {
            description: "The final sentence failed the rule, spelling or grammar checks.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameError" } } },
          },
          "502": {
            description: "The payment facilitator could not be reached; nothing was charged.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameError" } } },
          },
          "503": {
            description: "Game, bot-check or leaderboard service temporarily unavailable; nothing was charged.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/GameError" } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      SearchItem: {
        type: "object",
        required: ["title", "description", "url"],
        properties: {
          title: { type: "string", description: "Page title." },
          description: { type: "string", description: "One-line description." },
          url: { type: "string", format: "uri", description: "Absolute page URL." },
        },
        additionalProperties: false,
      },
      GalleryPreviewImage: {
        type: "object",
        required: ["src", "alt"],
        properties: {
          src: { type: "string", description: "Absolute image URL." },
          alt: { type: "string", description: "Alt text." },
          imageClassName: { type: "string", description: "CSS class for the preview frame." },
        },
        additionalProperties: false,
      },
      ApiError: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", description: "Machine-readable error code." },
              message: { type: "string", description: "Human-readable message." },
            },
            additionalProperties: false,
          },
        },
        description: "Error object used by the REST endpoints.",
        additionalProperties: false,
      },
      MethodNotAllowed: {
        allOf: [{ $ref: "#/components/schemas/ApiError" }],
        description: "This endpoint only supports GET.",
      },
      GalleryNotFound: {
        allOf: [{ $ref: "#/components/schemas/ApiError" }],
        description: "The requested gallery was not found.",
      },
      GameError: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "string",
            description:
              "Machine-readable error code, for example invalid_payload, invalid_run, run_incomplete, run_complete, run_already_submitted, invalid_date, invalid_nickname, payload_too_large, not_a_sentence, misspelled_words, too_fast, payment_unavailable, human_check_unavailable, game_unavailable, leaderboard_unavailable, or a specific failed rule code on 422.",
          },
          message: { type: "string", description: "Human-readable message (present on most codes)." },
          retryAfterMs: { type: "integer", description: "Milliseconds to wait; present on `too_fast`." },
          level: { type: "integer", description: "Rule level the sentence was checked against; present on sentence 422s." },
          failedRuleIds: { type: "array", items: { type: "string" }, description: "Which rules the sentence failed; present on rule 422s." },
          misspelled: { type: "array", items: { type: "string" }, description: "Words not found in a real English dictionary; present on `misspelled_words`." },
          token: { type: "string", description: "The still-valid run token; present on sentence 422s." },
          rules: { type: "array", items: { type: "string" }, description: "The satisfied rules so far; present on rule 422s." },
          cleared: { type: "integer", description: "Rules cleared before the failed step; present on `run_incomplete`." },
        },
        additionalProperties: true,
        description:
          "Flat error object used by the Damage Control game endpoints. The machine-readable code is the top-level `error`; extra fields depend on the code.",
      },
      Challenge: {
        type: "object",
        required: ["date", "weekday", "timeBucket", "rules"],
        properties: {
          date: { type: "string", format: "date", description: "Current UTC date." },
          weekday: { type: "string", description: "Current UTC weekday in words." },
          timeBucket: {
            type: "string",
            format: "time",
            pattern: "^[01]\\d:[0-5]\\d$|^2[0-3]:[0-5]\\d$",
            description: "Current 5-minute UTC bucket, HH:MM.",
          },
          rules: {
            type: "array",
            minItems: 20,
            maxItems: 20,
            items: { type: "string" },
            description: "All 20 rule descriptions in order.",
          },
        },
        additionalProperties: false,
      },
      ChallengeResponse: {
        allOf: [
          { $ref: "#/components/schemas/Challenge" },
          {
            type: "object",
            required: ["changesAt", "howToPlay"],
            properties: {
              changesAt: { type: "string", format: "date-time", description: "When the time bucket changes." },
              howToPlay: { type: "string", format: "uri", description: "The agent guide." },
            },
            additionalProperties: false,
          },
        ],
        description: "The current challenge plus when it changes.",
      },
      RunStep: {
        type: "object",
        properties: {
          token: { type: "string", description: "Signed run token from a previous step. Omit it to start a new run." },
          sentence: {
            type: "string",
            description: "The sentence to try clearing the next rule with (real, grammatical English).",
          },
        },
        additionalProperties: false,
      },
      RunState: {
        type: "object",
        required: ["token", "cleared", "nextRule"],
        properties: {
          token: { type: "string", description: "Fresh signed run token; keep the newest one." },
          cleared: { type: "integer", minimum: 0, maximum: 20, description: "Rules cleared so far." },
          nextRule: {
            oneOf: [{ type: "string" }, { type: "null" }],
            description: "The next rule to satisfy, or null after the final level.",
          },
          challenge: {
            $ref: "#/components/schemas/Challenge",
            description: "Present when the run started.",
          },
          rules: {
            type: "array",
            items: { type: "string" },
            description: "The satisfied rules so far; present after the first step.",
          },
          elapsedMs: { type: "integer", description: "Milliseconds since the run started; present after the first step." },
        },
        additionalProperties: false,
      },
      LeaderboardEntry: {
        type: "object",
        required: ["displayNickname", "level", "elapsedMs", "createdAt"],
        properties: {
          displayNickname: { type: "string", description: "The saved nickname." },
          level: { type: "integer", const: 20, description: "Rules cleared." },
          elapsedMs: { type: "integer", description: "Total run time in milliseconds." },
          createdAt: { type: "string", format: "date-time", description: "Submission time (UTC)." },
        },
        additionalProperties: false,
      },
      Leaderboard: {
        type: "object",
        required: ["date", "scores"],
        properties: {
          date: { type: "string", format: "date", description: "The UTC date of the board." },
          scores: {
            type: "array",
            maxItems: 50,
            items: { $ref: "#/components/schemas/LeaderboardEntry" },
            description: "Top 50 runs for the date.",
          },
        },
        additionalProperties: false,
      },
      GameScore: {
        type: "object",
        required: ["displayNickname", "level", "elapsedMs"],
        properties: {
          displayNickname: { type: "string", description: "The saved nickname." },
          level: { type: "integer", const: 20, description: "Rules cleared." },
          elapsedMs: { type: "integer", description: "Total run time in milliseconds." },
          rank: { type: ["integer", "null"], description: "Position on the day's board, or null when unranked." },
        },
        additionalProperties: false,
      },
      ScoreEntry: {
        type: "object",
        required: ["date", "score"],
        properties: {
          date: { type: "string", format: "date", description: "The UTC date of the board the score landed on." },
          score: { $ref: "#/components/schemas/GameScore" },
        },
        additionalProperties: false,
      },
      ScoreInput: {
        type: "object",
        required: ["token", "nickname", "sentence"],
        properties: {
          token: { type: "string", description: "Signed run token that cleared all 20 rules." },
          nickname: {
            type: "string",
            minLength: 1,
            maxLength: 24,
            description: "1 to 24 characters, no links or reserved names.",
          },
          sentence: {
            type: "string",
            description: "The final sentence that cleared all 20 rules; re-checked server-side.",
          },
        },
        additionalProperties: false,
      },
      X402Requirements: {
        type: "object",
        required: ["scheme", "network", "amount", "asset", "payTo", "maxTimeoutSeconds"],
        properties: {
          scheme: { type: "string", example: "exact", description: "x402 v2 payment scheme." },
          network: { type: "string", example: "eip155:8453", description: "CAIP-2 network identifier." },
          amount: { type: "string", example: "100000", description: "Amount in the asset's smallest unit, as a string." },
          asset: { type: "string", description: "Token identifier (Base USDC)." },
          payTo: { type: "string", description: "Payout wallet address." },
          maxTimeoutSeconds: { type: "integer", description: "How long the payment terms stay open." },
          extra: { type: "object", description: "Asset metadata.", additionalProperties: true },
        },
        additionalProperties: true,
      },
      X402PaymentRequired: {
        type: "object",
        required: ["x402Version", "accepts", "message"],
        properties: {
          x402Version: { type: "integer", const: 2, description: "x402 protocol version." },
          error: { type: "string", description: "Why payment is being requested." },
          resource: {
            type: "object",
            properties: {
              url: { type: "string", format: "uri" },
              description: { type: "string" },
              mimeType: { type: "string" },
              serviceName: { type: "string" },
            },
            additionalProperties: false,
            description: "The protected resource (the leaderboard entry).",
          },
          accepts: {
            type: "array",
            items: { $ref: "#/components/schemas/X402Requirements" },
            description: "Payment terms to accept exactly when retrying with `PAYMENT-SIGNATURE`.",
          },
          extensions: { type: "object", additionalProperties: true },
          donations: {
            type: "string",
            format: "uri",
            description: "Bitcoin donation page as an alternative way to support the site.",
          },
          message: { type: "string", description: "What this 402 means in plain language." },
        },
        additionalProperties: false,
      },
    },
  },
};

export function GET() {
  return Response.json(spec, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}