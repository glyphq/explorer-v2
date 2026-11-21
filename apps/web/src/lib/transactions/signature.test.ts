// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, it } from "bun:test";

import { findTransactionSignature } from "./signature";

// Transaction swiisz...dghggayi from tick 92,028,235.
const ARCHIVED_RECORD =
  "30cbdceb7b2a86edb4c4138537a63652edc669857354769deb0298bbf6b3f4a3" +
  "0100000000000000000000000000000000000000000000000000000000000000" +
  "64000000000000004b3d7c050200500066909453491bc4b54cdf961e6c89d322" +
  "de66ea7ac5467259ce8a1925025be64e72d4cecf46ba89e5ed5c0d3c995f2825" +
  "2b19c87cd1d07e18498039d4675a791d5150415900000000d850000000000000" +
  "09e53e93868dd0a835e74db933f4e32895501ac914b4835b5fb985ec59e29dbbf" +
  "5f58b27ffb1477c3706a025538afed62573250ba84fb32ff3b40277e12d2000";

const HASH = "swiiszroaypjwcfporkdpxtxqhtbpqlpuoulhyengbztuncldnzxdghggayi";
const SIGNATURE =
  "CeU+k4aN0Kg15025M/TjKJVQGskUtINbX7mF7Fninbv19Ysn/7FHfDcGoCVTiv7WJXMl" + "C6hPsy/ztAJ34S0gAA==";

function fromHex(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

describe("findTransactionSignature", () => {
  it("recovers the signature from an archived transaction record", () => {
    expect(findTransactionSignature(fromHex(ARCHIVED_RECORD), HASH)).toBe(SIGNATURE);
  });

  it("finds a record after other transactions in the tick", () => {
    const record = fromHex(ARCHIVED_RECORD);
    const data = new Uint8Array(record.length + 144);
    data.set(record, 144);

    expect(findTransactionSignature(data, HASH)).toBe(SIGNATURE);
  });

  it("returns null when the transaction is not in the section", () => {
    expect(
      findTransactionSignature(
        fromHex(ARCHIVED_RECORD),
        "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
      ),
    ).toBeNull();
  });

  it("returns null for a truncated record", () => {
    const record = fromHex(ARCHIVED_RECORD);
    expect(findTransactionSignature(record.subarray(0, record.length - 1), HASH)).toBeNull();
  });
});
