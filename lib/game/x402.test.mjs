import assert from "node:assert/strict";
import test from "node:test";
import {
  DONATIONS_URL,
  decodePayment,
  isSameOriginBrowser,
  matchesRequirements,
  paymentRequired,
  readX402Config,
  verifyPayment,
} from "./x402.ts";

const env = {
  X402_PAY_TO: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
  X402_FACILITATOR_URL: "https://facilitator.example/",
};

test("config needs a payout address and an https facilitator", () => {
  assert.equal(readX402Config({}), null);
  assert.equal(readX402Config({ X402_PAY_TO: env.X402_PAY_TO }).facilitatorUrl, "https://facilitator.payai.network");
  assert.equal(readX402Config({ ...env, X402_FACILITATOR_URL: "http://x" }), null);
  const config = readX402Config(env);
  assert.equal(config.requirements.network, "eip155:8453");
  assert.equal(config.requirements.amount, "100000");
  assert.equal(config.facilitatorUrl, "https://facilitator.example");
});

test("the 402 carries a base64 PAYMENT-REQUIRED header and the donations link", async () => {
  const response = paymentRequired("https://lucashanson.dk/api/game/scores", readX402Config(env), "PAYMENT-SIGNATURE header is required");
  assert.equal(response.status, 402);
  const header = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString());
  assert.equal(header.x402Version, 2);
  assert.equal(header.accepts[0].payTo, env.X402_PAY_TO);
  assert.equal(header.donations, DONATIONS_URL);
  assert.match(response.headers.get("link"), /bitcoin/);
  assert.deepEqual(await response.json(), header);
});

test("without config the 402 offers no payment options", () => {
  const response = paymentRequired("https://lucashanson.dk/api/game/scores", null, "closed");
  const header = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString());
  assert.deepEqual(header.accepts, []);
});

test("a payment must accept our exact terms", () => {
  const { requirements } = readX402Config(env);
  const payload = { x402Version: 2, accepted: { ...requirements } };
  assert.equal(matchesRequirements(payload, requirements), true);
  assert.equal(matchesRequirements({ ...payload, accepted: { ...requirements, amount: "1" } }, requirements), false);
  assert.equal(matchesRequirements({ ...payload, accepted: { ...requirements, payTo: "0x" + "1".repeat(40) } }, requirements), false);
  assert.equal(matchesRequirements({ ...payload, x402Version: 1 }, requirements), false);
});

test("payment headers decode safely", () => {
  assert.deepEqual(decodePayment(Buffer.from('{"a":1}').toString("base64")), { a: 1 });
  assert.equal(decodePayment("not base64 json"), null);
  assert.equal(decodePayment(null), null);
  assert.equal(decodePayment(Buffer.from("[1]").toString("base64")), null);
});

test("verify posts payload and requirements to the facilitator", async () => {
  const config = readX402Config(env);
  let seen;
  const fake = async (url, init) => {
    seen = { url, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ isValid: true }));
  };
  assert.deepEqual(await verifyPayment(config, { p: 1 }, fake), { isValid: true });
  assert.equal(seen.url, "https://facilitator.example/verify");
  assert.deepEqual(seen.body.paymentRequirements, config.requirements);
});

test("only same-origin browser fetches skip payment", () => {
  const browser = {
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "cors",
    origin: "https://lucashanson.dk",
    "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/140",
  };
  const request = (headers) => new Request("https://lucashanson.dk/api/game/scores", { method: "POST", headers });
  assert.equal(isSameOriginBrowser(request(browser)), true);
  assert.equal(isSameOriginBrowser(request({ ...browser, "sec-fetch-site": "cross-site" })), false);
  assert.equal(isSameOriginBrowser(request({ ...browser, "user-agent": "Mozilla/5.0 HeadlessChrome" })), false);
  assert.equal(isSameOriginBrowser(request({ ...browser, "user-agent": "python-requests/2.32" })), false);
  assert.equal(isSameOriginBrowser(request({})), false);
});
