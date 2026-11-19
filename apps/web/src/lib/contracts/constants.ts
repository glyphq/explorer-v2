export const BURN_IDENTITY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB";

export function isBurnIdentity(identity: string | null | undefined): boolean {
  return identity?.toUpperCase() === BURN_IDENTITY;
}
