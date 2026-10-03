import { bech32 } from "@scure/base";
import { HARDENED_OFFSET, HDKey } from "@scure/bip32";

const ZPUB_VERSIONS = { public: 0x04b24746, private: 0x04b2430c };

/** Select the first external BIP84 address without a confirmed received output.
 * Call only from the server: the explorer sees addresses, never the account key.
 */
export async function getBitcoinReceiveAddress(zpub: string): Promise<string> {
  if (!zpub.startsWith("zpub")) {
    throw new Error("A Bitcoin mainnet account zpub is required");
  }

  const account = HDKey.fromExtendedKey(zpub, ZPUB_VERSIONS);
  if (account.depth !== 3 || account.index < HARDENED_OFFSET || account.privateKey) {
    throw new Error("An account-level public key is required");
  }

  const receivingChain = account.deriveChild(0);
  const signal = AbortSignal.timeout(10_000);

  for (let index = 0; index < HARDENED_OFFSET; index++) {
    signal.throwIfAborted();
    const publicKeyHash = receivingChain.deriveChild(index).pubKeyHash;
    if (!publicKeyHash) throw new Error("Missing Bitcoin public key");
    const address = bech32.encode("bc", [0, ...bech32.toWords(publicKeyHash)]);

    const response = await fetch(`https://blockstream.info/api/address/${address}`, {
      cache: "no-store",
      signal,
    });
    if (!response.ok) throw new Error("Bitcoin address history is unavailable");

    const history = await response.json();
    const receivedOutputs = history?.chain_stats?.funded_txo_count;
    if (
      history?.address !== address ||
      !Number.isSafeInteger(receivedOutputs) ||
      receivedOutputs < 0
    ) {
      throw new Error("Invalid Bitcoin address history");
    }

    // History, not balance: spending donations must never reset this address.
    if (receivedOutputs === 0) return address;
  }

  throw new Error("Bitcoin receive addresses are exhausted");
}
