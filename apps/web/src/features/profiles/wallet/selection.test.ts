// @ts-expect-error - bun:test is provided by the Bun runtime; the project does not install bun-types.
import { describe, expect, test } from "bun:test";

import { selectWalletConnectIdentity, walletConnectIdentities } from "./selection";

const FIRST = "BYBYFUMBVLPUCANXEXTSKVMGFCJBMTLPPOFVPNSATABMWDGTMFXPLZLBCXJL";
const SECOND = "AXASCBRRCMOKTEUEKDBMPSNIRVKAEXXKPOGOVCQLLAZWNVSGMWDABJAEAXTN";

describe("WalletConnect account selection", () => {
  test("extracts unique identities from account strings", () => {
    expect(
      walletConnectIdentities([
        `qubic:mainnet:${FIRST}`,
        `qubic:mainnet:${SECOND}`,
        `qubic:mainnet:${FIRST}`,
        "qubic:mainnet:NOT_A_VALID_IDENTITY",
      ]),
    ).toEqual([FIRST, SECOND]);
  });

  test("selects the account requested by the page", () => {
    expect(
      selectWalletConnectIdentity([`qubic:mainnet:${FIRST}`, `qubic:mainnet:${SECOND}`], SECOND),
    ).toBe(SECOND);
  });

  test("falls back to the first account when the requested account is absent", () => {
    expect(selectWalletConnectIdentity([`qubic:mainnet:${FIRST}`], SECOND)).toBe(FIRST);
  });

  test("returns null without a valid account", () => {
    expect(selectWalletConnectIdentity([], SECOND)).toBeNull();
    expect(selectWalletConnectIdentity(undefined)).toBeNull();
  });
});
