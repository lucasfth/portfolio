import assert from "node:assert/strict";
import { test } from "node:test";
import { getBitcoinReceiveAddress } from "../lib/bitcoin.ts";

// Public BIP84 account-zero test vector; never use a real wallet key here.
const ZPUB = "zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs";
const FIRST = "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu";
const SECOND = "bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g";

function addressHistory(address, confirmedReceived = 0, pendingReceived = 0, spent = 0) {
  return {
    address,
    chain_stats: {
      funded_txo_count: confirmedReceived,
      funded_txo_sum: confirmedReceived * 1000,
      spent_txo_count: spent,
      spent_txo_sum: spent * 1000,
      tx_count: confirmedReceived + spent,
    },
    mempool_stats: { funded_txo_count: pendingReceived },
  };
}

function useHistory(t, history) {
  t.mock.method(globalThis, "fetch", async (url) => {
    const address = new URL(url).pathname.split("/").at(-1);
    assert.ok(history.has(address), `Unexpected receive address: ${address}`);
    return Response.json(history.get(address));
  });
}

test("returns the BIP84 first receive address when no donation is confirmed", async (t) => {
  useHistory(t, new Map([[FIRST, addressHistory(FIRST)]]));
  assert.equal(await getBitcoinReceiveAddress(ZPUB), FIRST);
});

test("advances to the next BIP84 receive address after a confirmed donation", async (t) => {
  useHistory(t, new Map([
    [FIRST, addressHistory(FIRST, 1)],
    [SECOND, addressHistory(SECOND)],
  ]));
  assert.equal(await getBitcoinReceiveAddress(ZPUB), SECOND);
});

test("does not reuse a paid address after its funds have been spent", async (t) => {
  useHistory(t, new Map([
    [FIRST, addressHistory(FIRST, 1, 0, 1)],
    [SECOND, addressHistory(SECOND)],
  ]));
  assert.equal(await getBitcoinReceiveAddress(ZPUB), SECOND);
});

test("pending donations do not rotate the address before confirmation", async (t) => {
  useHistory(t, new Map([[FIRST, addressHistory(FIRST, 0, 1)]]));
  assert.equal(await getBitcoinReceiveAddress(ZPUB), FIRST);
});

test("rejects malformed, private, and non-account keys before consulting the explorer", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Invalid keys must not reach the explorer");
  });
  for (const key of [
    "",
    "zpub-invalid",
    // Publicly documented BIP84 private test vector, not an actual wallet.
    "zprvAdG4iTXWBoARxkkzNpNh8r6Qag3irQB8PzEMkAFeTRXxHpbF9z4QgEvBRmfvqWvGp42t42nvgGpNgYSJA9iefm1yYNZKEm7z6qUWCroSQnE",
    // BIP84 master public key, not an account-level export.
    "zpub6jftahH18ngZxLmXaKw3GSZzZsszmt9WqedkyZdezFtWRFBZqsQH5hyUmb4pCEeZGmVfQuP5bedXTB8is6fTv19U1GQRyQUKQGUTzyHACMF",
  ]) {
    await assert.rejects(() => getBitcoinReceiveAddress(key));
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("does not guess an unused address when the explorer is unavailable", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("Unavailable", { status: 503 }));
  await assert.rejects(() => getBitcoinReceiveAddress(ZPUB));
});

test("propagates network failures instead of returning an unchecked address", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Network unavailable"); });
  await assert.rejects(() => getBitcoinReceiveAddress(ZPUB));
});

test("rejects explorer history for a different address", async (t) => {
  useHistory(t, new Map([[FIRST, addressHistory(SECOND)]]));
  await assert.rejects(() => getBitcoinReceiveAddress(ZPUB));
});

test("rejects missing or invalid confirmed receipt counts rather than rotating", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  for (const count of [undefined, null, -1, 0.5, "0", Number.MAX_SAFE_INTEGER + 1]) {
    fetch.mock.mockImplementation(async () => Response.json({
      address: FIRST,
      chain_stats: { funded_txo_count: count },
    }));
    await assert.rejects(() => getBitcoinReceiveAddress(ZPUB));
  }
});
