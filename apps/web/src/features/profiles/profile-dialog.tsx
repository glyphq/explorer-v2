"use client";

import {
  Button,
  buttonVariants,
  Input,
  Label,
  Modal,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import { CheckCircleIcon } from "@solar-icons/react/linear/check-circle";
import { DangerTriangleIcon } from "@solar-icons/react/linear/danger-triangle";
import { PuzzleIcon } from "@solar-icons/react/linear/puzzle";
import { QrCodeIcon } from "@solar-icons/react/linear/qr-code";
import { SmartphoneIcon } from "@solar-icons/react/linear/smartphone";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { type ReactNode, useEffect, useState } from "react";
import { sileo } from "sileo";

import { GlyphMark } from "@/components/glyph-mark";
import { shorten } from "@/lib/format";
import { normalizeSocialUrl, SOCIAL_LABELS } from "@/lib/profiles/socials";
import type {
  ProfileChallenge,
  ProfileChallengeAction,
  ProfileInput,
  ProfileSocials,
  PublicProfile,
  SocialPlatform,
} from "@/lib/profiles/types";
import { SOCIAL_PLATFORMS } from "@/lib/profiles/types";

import {
  normalizeSignatureHex,
  ProfileRequestError,
  profileErrorMessage,
  requestProfileChallenge,
  revokeProfile,
  saveProfile,
} from "./api";
import { ProfileVerificationBadge } from "./profile-badge";
import {
  BIO_MAX,
  DISPLAY_NAME_MAX,
  isChallengeExpired,
  socialValidationMessage,
  WEBSITE_MAX,
  websiteValidationMessage,
} from "./profile-format";
import { ProfileSocialIcon } from "./social-icons";
import { profileQueryKey } from "./use-profile";
import { ProfileWalletProvider, useProfileWallet } from "./wallet";
import { isMobileWalletEnvironment, qubicWalletPairingLink } from "./wallet/connectors";
import type { ProfileWalletKind, ProfileWalletSignature } from "./wallet/types";

class ProfileUiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileUiError";
  }
}

function readableError(error: unknown): string {
  if (error instanceof ProfileUiError) {
    return error.message;
  }
  return profileErrorMessage(error);
}

function walletErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

export function ProfileDialog({
  identity,
  onOpenChange,
  open,
  profile,
}: {
  identity: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  profile: PublicProfile | null;
}) {
  if (!open) {
    return null;
  }
  if (profile?.kind === "exchange") {
    return <ExchangeProfileDialog onOpenChange={onOpenChange} profile={profile} />;
  }
  return (
    <ProfileWalletProvider preferredIdentity={identity}>
      <ProfileDialogContent identity={identity} onOpenChange={onOpenChange} profile={profile} />
    </ProfileWalletProvider>
  );
}

function ExchangeProfileDialog({
  onOpenChange,
  profile,
}: {
  onOpenChange: (open: boolean) => void;
  profile: PublicProfile;
}) {
  return (
    <Modal isOpen onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container scroll="inside" size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Curated profile</Modal.Heading>
              <p className="mt-1 text-muted text-sm">
                This profile is managed by Qubic for an exchange account.
              </p>
            </Modal.Header>
            <Modal.Body className="min-w-0 gap-3">
              <ProfileVerificationBadge profile={profile} />
              <p className="text-foreground/85 text-sm leading-relaxed">
                This account is managed by a Qubic exchange. Its profile is curated by Qubic and
                cannot be changed from the explorer.
              </p>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function ProfileDialogContent({
  identity,
  onOpenChange,
  profile,
}: {
  identity: string;
  onOpenChange: (open: boolean) => void;
  profile: PublicProfile | null;
}) {
  const wallet = useProfileWallet();
  const queryClient = useQueryClient();
  const isExchange = profile?.kind === "exchange";
  const isEdit = profile?.kind === "wallet";
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [website, setWebsite] = useState(profile?.website ?? "");
  const [socials, setSocials] = useState<ProfileSocials>(profile?.socials ?? {});
  const [contentErrors, setContentErrors] = useState<{
    bio: string | null;
    displayName: string | null;
  }>({ bio: null, displayName: null });
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState<"load-claim" | "load-revoke" | "sign" | null>(null);
  const [pendingKind, setPendingKind] = useState<ProfileWalletKind | null>(null);
  const [review, setReview] = useState<{
    action: ProfileChallengeAction;
    challenge: ProfileChallenge;
  } | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileWallet, setMobileWallet] = useState(false);

  useEffect(() => {
    setMobileWallet(isMobileWalletEnvironment());
  }, []);

  const account = wallet.account;
  const isMatchingAccount = account !== null && account.identity === identity;

  const trimmedName = displayName.trim();
  let nameError: string | null = null;
  if (trimmedName.length === 0) {
    nameError = "Enter a display name.";
  } else if (trimmedName.length > DISPLAY_NAME_MAX) {
    nameError = `Keep the display name under ${DISPLAY_NAME_MAX} characters.`;
  }
  const bioError = bio.length > BIO_MAX ? `Keep the bio under ${BIO_MAX} characters.` : null;
  const websiteError = websiteValidationMessage(website);
  const socialErrors = Object.fromEntries(
    SOCIAL_PLATFORMS.map((platform) => [
      platform,
      socialValidationMessage(platform, socials[platform] ?? ""),
    ]),
  ) as Record<SocialPlatform, string | null>;
  const socialsValid = SOCIAL_PLATFORMS.every((platform) => socialErrors[platform] === null);
  const formValid =
    nameError === null && bioError === null && websiteError === null && socialsValid;

  let title = isEdit ? "Edit profile" : "Claim profile";
  let description = isEdit
    ? "Update the public name, bio, and links shown on this account."
    : "Verify this account with your wallet and add a public profile.";
  if (isExchange) {
    title = "Curated profile";
    description = "This profile is managed by Qubic for an exchange account.";
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && busy !== null) {
      return;
    }
    onOpenChange(next);
  };

  const handleConnect = async (kind: ProfileWalletKind) => {
    setError(null);
    setPendingKind(kind);
    wallet.clearError();
    try {
      await wallet.connect(kind, identity);
    } catch (cause) {
      setError(walletErrorMessage(cause, "Could not connect to your wallet. Try again."));
    } finally {
      setPendingKind(null);
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    try {
      await wallet.disconnect();
    } catch (cause) {
      setError(walletErrorMessage(cause, "Could not disconnect your wallet. Try again."));
    }
    setRevokeConfirm(false);
    setReview(null);
  };

  const loadChallenge = async (action: ProfileChallengeAction): Promise<ProfileChallenge> => {
    const challenge = await requestProfileChallenge(identity, action);
    if (challenge.identity !== identity) {
      throw new ProfileUiError(
        "The signing request was issued for a different account. Try again.",
      );
    }
    if (challenge.action !== action) {
      throw new ProfileUiError("The signing request did not match this action. Try again.");
    }
    if (isChallengeExpired(challenge.expiresAt)) {
      throw new ProfileRequestError("challenge_expired");
    }
    return challenge;
  };

  const signChallenge = async (
    challenge: ProfileChallenge,
  ): Promise<{ challengeId: string; signatureHex: string }> => {
    if (isChallengeExpired(challenge.expiresAt)) {
      throw new ProfileRequestError("challenge_expired");
    }

    let signed: ProfileWalletSignature;
    try {
      signed = await wallet.signMessage(challenge.message);
    } catch (cause) {
      throw new ProfileUiError(
        walletErrorMessage(cause, "Signing was cancelled or rejected in your wallet."),
      );
    }

    if (signed.identity !== identity) {
      throw new ProfileUiError(
        "Your wallet signed with a different account. Connect the account that owns this profile.",
      );
    }

    const signatureHex = normalizeSignatureHex(signed.signatureHex);
    if (!signatureHex) {
      throw new ProfileUiError("Your wallet returned an unusable signature. Try again.");
    }

    return { challengeId: challenge.id, signatureHex };
  };

  const handleSaveIntent = async () => {
    setShowErrors(true);
    setError(null);
    setContentErrors({ bio: null, displayName: null });
    if (!formValid) {
      return;
    }
    setBusy("load-claim");
    try {
      const { hasDisallowedLanguage } = await import("@/lib/profiles/moderation");
      const nextContentErrors = {
        bio: hasDisallowedLanguage(bio) ? "Remove offensive language from the bio." : null,
        displayName: hasDisallowedLanguage(trimmedName)
          ? "Remove offensive language from the display name."
          : null,
      };
      if (nextContentErrors.bio || nextContentErrors.displayName) {
        setContentErrors(nextContentErrors);
        return;
      }
      const challenge = await loadChallenge("claim");
      setReview({ action: "claim", challenge });
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setBusy(null);
    }
  };

  const handleRevokeIntent = async () => {
    setError(null);
    setBusy("load-revoke");
    try {
      const challenge = await loadChallenge("revoke");
      setRevokeConfirm(false);
      setReview({ action: "revoke", challenge });
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setBusy(null);
    }
  };

  const confirmReview = async () => {
    if (!review) {
      return;
    }
    setError(null);
    setBusy("sign");
    try {
      const signed = await signChallenge(review.challenge);
      if (review.action === "revoke") {
        await revokeProfile(identity, signed);
        queryClient.setQueryData(profileQueryKey(identity), null);
        sileo.success({
          description: "This account no longer has a public profile.",
          title: "Profile revoked",
        });
        onOpenChange(false);
        return;
      }

      const input: ProfileInput = {
        bio: bio.trim(),
        displayName: trimmedName,
      };
      const websiteValue = website.trim();
      if (websiteValue) {
        input.website = websiteValue;
      }
      const normalizedSocials: ProfileSocials = {};
      for (const platform of SOCIAL_PLATFORMS) {
        const raw = (socials[platform] ?? "").trim();
        if (!raw) {
          continue;
        }
        const normalized = normalizeSocialUrl(platform, raw);
        if (normalized) {
          normalizedSocials[platform] = normalized;
        }
      }
      if (Object.keys(normalizedSocials).length > 0) {
        input.socials = normalizedSocials;
      }
      const saved = await saveProfile(identity, { ...signed, profile: input });
      queryClient.setQueryData(profileQueryKey(identity), saved);
      sileo.success({
        description: saved.displayName,
        title: isEdit ? "Profile updated" : "Profile claimed",
      });
      onOpenChange(false);
    } catch (cause) {
      setError(readableError(cause));
      if (cause instanceof ProfileRequestError && cause.code === "challenge_expired") {
        setReview(null);
      }
      setRevokeConfirm(false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal isOpen onOpenChange={handleOpenChange}>
      <Modal.Backdrop>
        <Modal.Container scroll="inside" size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
              <p className="mt-1 text-muted text-sm">{description}</p>
            </Modal.Header>
            <Modal.Body className="min-w-0 gap-5">
              {isExchange && profile ? (
                <div className="flex flex-col gap-3">
                  <ProfileVerificationBadge profile={profile} />
                  <p className="text-foreground/85 text-sm leading-relaxed">
                    This account is managed by a Qubic exchange. Its profile is curated by Qubic and
                    cannot be changed from the explorer.
                  </p>
                </div>
              ) : null}

              {!isExchange && account === null ? (
                <div className="flex flex-col gap-2">
                  <WalletOption
                    description={glyphDescription(wallet.glyphReadiness)}
                    disabled={wallet.isConnecting || wallet.glyphReadiness === "preparing"}
                    icon={<GlyphMark className="size-5" />}
                    onPress={() => {
                      if (wallet.glyphReadiness === "error") {
                        wallet.prepareGlyph();
                        return;
                      }
                      handleConnect("glyph").catch(() => undefined);
                    }}
                    pending={wallet.glyphReadiness === "preparing" || pendingKind === "glyph"}
                    title="Glyph Wallet"
                    variant="primary"
                  />
                  {wallet.availability.extension ? (
                    <WalletOption
                      description="Connect with the Qubic browser extension."
                      disabled={wallet.isConnecting}
                      icon={<PuzzleIcon className="size-5" />}
                      onPress={() => {
                        handleConnect("extension").catch(() => undefined);
                      }}
                      pending={pendingKind === "extension"}
                      title="Browser extension"
                      variant="outline"
                    />
                  ) : null}
                  {wallet.availability.walletconnect ? (
                    <WalletOption
                      description="Scan a QR code with a compatible wallet."
                      disabled={wallet.isConnecting}
                      icon={<QrCodeIcon className="size-5" />}
                      onPress={() => {
                        handleConnect("walletconnect").catch(() => undefined);
                      }}
                      pending={pendingKind === "walletconnect"}
                      title="WalletConnect"
                      variant="outline"
                    />
                  ) : null}
                  {wallet.walletConnectUri ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl bg-surface-secondary p-4">
                      {mobileWallet ? (
                        <a
                          className={`${buttonVariants({ size: "sm", variant: "primary" })} w-full justify-center`}
                          href={qubicWalletPairingLink(wallet.walletConnectUri)}
                        >
                          <SmartphoneIcon className="size-4" />
                          Open Qubic Wallet
                        </a>
                      ) : null}
                      <QRCodeSVG
                        bgColor="transparent"
                        fgColor="currentColor"
                        level="M"
                        marginSize={1}
                        size={196}
                        title="WalletConnect QR code"
                        value={wallet.walletConnectUri}
                      />
                      <p className="max-w-full text-center text-muted text-xs">
                        {mobileWallet
                          ? "Open the official Qubic Wallet app, then approve the connection."
                          : "Scan this code with your wallet, then approve the connection."}
                      </p>
                    </div>
                  ) : null}
                  {wallet.error && !error ? (
                    <p className="text-muted text-xs">
                      The wallet did not connect. Try again or choose another option.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!isExchange && account !== null && !isMatchingAccount ? (
                <div className="rounded-xl bg-warning/10 p-3 ring-1 ring-warning/25">
                  <div className="flex items-center gap-2">
                    <DangerTriangleIcon className="size-4 shrink-0 text-warning" />
                    <p className="font-medium text-sm">This is the wrong account</p>
                  </div>
                  <p className="mt-1 text-muted text-xs leading-relaxed">
                    The connected wallet does not match this account. Signing is disabled until the
                    correct wallet is connected.
                  </p>
                  <dl className="mt-2 flex flex-col gap-1 text-xs">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-muted">Account</dt>
                      <dd className="select-all break-all font-mono">{identity}</dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-muted">Connected wallet</dt>
                      <dd className="select-all break-all font-mono">{account.identity}</dd>
                    </div>
                  </dl>
                  <Button
                    className="mt-3 w-full sm:w-auto"
                    isDisabled={busy !== null}
                    onPress={() => {
                      handleDisconnect().catch(() => undefined);
                    }}
                    size="sm"
                    variant="danger-soft"
                  >
                    Disconnect and choose another wallet
                  </Button>
                </div>
              ) : null}

              {!isExchange && isMatchingAccount ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-secondary px-3 py-2">
                  <CheckCircleIcon className="size-4 shrink-0 text-success" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-xs">{account.label}</p>
                    <p className="break-all font-mono text-[11px] text-muted">
                      {shorten(identity, 16, 10)}
                    </p>
                  </div>
                  <Button
                    isDisabled={busy !== null}
                    onPress={() => {
                      handleDisconnect().catch(() => undefined);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    Disconnect
                  </Button>
                </div>
              ) : null}

              {!isExchange && isMatchingAccount ? (
                <>
                  <TextField
                    className="min-w-0"
                    fullWidth
                    isDisabled={review !== null}
                    isRequired
                    onChange={(value) => {
                      setContentErrors((current) => ({ ...current, displayName: null }));
                      setDisplayName(value);
                    }}
                    value={displayName}
                  >
                    <Label>Display name</Label>
                    <Input placeholder="Your public name" />
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="text-muted text-xs">Shown as the account name.</span>
                      <span
                        className={
                          displayName.length > DISPLAY_NAME_MAX
                            ? "text-danger text-xs tabular-nums"
                            : "text-muted text-xs tabular-nums"
                        }
                      >
                        {displayName.length}/{DISPLAY_NAME_MAX}
                      </span>
                    </div>
                    {showErrors && nameError ? (
                      <p className="mt-1 text-danger text-xs" role="alert">
                        {nameError}
                      </p>
                    ) : null}
                    {showErrors && contentErrors.displayName ? (
                      <p className="mt-1 text-danger text-xs" role="alert">
                        {contentErrors.displayName}
                      </p>
                    ) : null}
                  </TextField>

                  <TextField
                    className="min-w-0"
                    fullWidth
                    isDisabled={review !== null}
                    onChange={(value) => {
                      setContentErrors((current) => ({ ...current, bio: null }));
                      setBio(value);
                    }}
                    value={bio}
                  >
                    <Label>Bio</Label>
                    <TextArea
                      className="min-h-24 resize-y"
                      placeholder="A short description of this account"
                      rows={4}
                    />
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="text-muted text-xs">Optional. Plain text only.</span>
                      <span
                        className={
                          bio.length > BIO_MAX
                            ? "text-danger text-xs tabular-nums"
                            : "text-muted text-xs tabular-nums"
                        }
                      >
                        {bio.length}/{BIO_MAX}
                      </span>
                    </div>
                    {bioError ? (
                      <p className="mt-1 text-danger text-xs" role="alert">
                        {bioError}
                      </p>
                    ) : null}
                    {showErrors && contentErrors.bio ? (
                      <p className="mt-1 text-danger text-xs" role="alert">
                        {contentErrors.bio}
                      </p>
                    ) : null}
                  </TextField>

                  <TextField
                    className="min-w-0"
                    fullWidth
                    isDisabled={review !== null}
                    onChange={setWebsite}
                    value={website}
                  >
                    <Label>Website</Label>
                    <Input placeholder="https://example.com" type="url" />
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="text-muted text-xs">Optional. HTTPS only.</span>
                      <span
                        className={
                          website.length > WEBSITE_MAX
                            ? "text-danger text-xs tabular-nums"
                            : "text-muted text-xs tabular-nums"
                        }
                      >
                        {website.length}/{WEBSITE_MAX}
                      </span>
                    </div>
                    {websiteError && website.trim() ? (
                      <p className="mt-1 text-danger text-xs" role="alert">
                        {websiteError}
                      </p>
                    ) : null}
                  </TextField>

                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="font-medium text-sm">Social links</p>
                      <p className="mt-0.5 text-muted text-xs">
                        Optional. Use a handle or a full profile link.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {SOCIAL_PLATFORMS.map((platform) => {
                        const socialError = showErrors ? socialErrors[platform] : null;
                        return (
                          <TextField
                            className="min-w-0"
                            fullWidth
                            isDisabled={review !== null}
                            key={platform}
                            onChange={(value) =>
                              setSocials((current) => ({ ...current, [platform]: value }))
                            }
                            value={socials[platform] ?? ""}
                          >
                            <Label>
                              <span className="inline-flex items-center gap-1.5">
                                <ProfileSocialIcon
                                  className="size-3.5 text-muted"
                                  kind={platform}
                                />
                                {SOCIAL_LABELS[platform]}
                              </span>
                            </Label>
                            <Input placeholder={socialPlaceholder(platform)} />
                            {socialError ? (
                              <p className="mt-1 text-danger text-xs" role="alert">
                                {socialError}
                              </p>
                            ) : null}
                          </TextField>
                        );
                      })}
                    </div>
                  </div>

                  {isEdit && review === null ? (
                    <div className="mt-1">
                      <p className="font-medium text-sm">Remove profile</p>
                      <p className="mt-1 text-muted text-xs leading-relaxed">
                        Removes the public name, bio, website, and social links from this account.
                        The account and its balance stay unchanged.
                      </p>
                      {revokeConfirm ? (
                        <div className="mt-3 rounded-xl bg-danger/5 p-3 ring-1 ring-danger/20">
                          <p className="font-medium text-sm">Revoke this profile?</p>
                          <p className="mt-1 text-muted text-xs leading-relaxed">
                            You will sign one more message with the connected wallet.
                          </p>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <Button
                              className="w-full sm:w-auto"
                              isDisabled={busy !== null}
                              onPress={() => {
                                handleRevokeIntent().catch(() => undefined);
                              }}
                              size="sm"
                              variant="danger"
                            >
                              {busy === "load-revoke" ? (
                                <Spinner color="current" size="sm" />
                              ) : null}
                              {busy === "load-revoke" ? "Preparing request" : "Review revocation"}
                            </Button>
                            <Button
                              className="w-full sm:w-auto"
                              isDisabled={busy !== null}
                              onPress={() => setRevokeConfirm(false)}
                              size="sm"
                              variant="ghost"
                            >
                              Keep profile
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          className="mt-3"
                          isDisabled={busy !== null}
                          onPress={() => setRevokeConfirm(true)}
                          size="sm"
                          variant="danger-soft"
                        >
                          Revoke profile
                        </Button>
                      )}
                    </div>
                  ) : null}
                </>
              ) : null}

              {review ? (
                <div className="rounded-xl bg-surface-secondary p-3">
                  <p className="font-medium text-sm">
                    {review.action === "revoke"
                      ? "Review the revocation request"
                      : "Review the claim request"}
                  </p>
                  <p className="mt-1 text-muted text-xs leading-relaxed">
                    Your wallet will show this exact text. Signing does not send a transaction or
                    cost QU.
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs underline-offset-4 hover:underline">
                      Show challenge message
                    </summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background p-2 font-mono text-[11px] text-foreground/80">
                      {review.challenge.message}
                    </pre>
                  </details>
                </div>
              ) : null}

              {error ? (
                <div
                  className="rounded-lg bg-danger/10 px-3 py-2 text-danger text-xs leading-relaxed"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
            </Modal.Body>
            {!isExchange && isMatchingAccount ? (
              <Modal.Footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {review ? (
                  <>
                    <Button
                      className="w-full sm:w-auto"
                      isDisabled={busy !== null}
                      onPress={() => setReview(null)}
                      variant="ghost"
                    >
                      Back
                    </Button>
                    <Button
                      className="w-full sm:w-auto"
                      isDisabled={busy !== null}
                      onPress={() => {
                        confirmReview().catch(() => undefined);
                      }}
                      variant={review.action === "revoke" ? "danger" : "primary"}
                    >
                      {busy === "sign" ? <Spinner color="current" size="sm" /> : null}
                      {busy === "sign"
                        ? "Waiting for wallet"
                        : reviewActionLabel(review.action, isEdit)}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      className="w-full sm:w-auto"
                      isDisabled={busy !== null}
                      onPress={() => onOpenChange(false)}
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                    <Button
                      className="w-full sm:w-auto"
                      isDisabled={busy !== null}
                      onPress={() => {
                        handleSaveIntent().catch(() => undefined);
                      }}
                      variant="primary"
                    >
                      {busy === "load-claim" ? <Spinner color="current" size="sm" /> : null}
                      {busy === "load-claim" ? "Preparing request" : saveActionLabel(isEdit)}
                    </Button>
                  </>
                )}
              </Modal.Footer>
            ) : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function glyphDescription(readiness: "idle" | "preparing" | "ready" | "error"): string {
  if (readiness === "preparing") {
    return "Preparing the Glyph Wallet relay.";
  }
  if (readiness === "error") {
    return "Relay unavailable. Tap to retry.";
  }
  return "Connect with Glyph Wallet through the relay.";
}

function reviewActionLabel(action: ProfileChallengeAction, isEdit: boolean): string {
  if (action === "revoke") {
    return "Sign and revoke";
  }
  return isEdit ? "Sign and save" : "Sign and claim";
}

function saveActionLabel(isEdit: boolean): string {
  return isEdit ? "Save changes" : "Claim profile";
}

const SOCIAL_PLACEHOLDERS: Record<SocialPlatform, string> = {
  discord: "@yourhandle",
  github: "https://github.com/yourhandle",
  telegram: "@yourhandle",
  x: "@yourhandle",
};

function socialPlaceholder(platform: SocialPlatform): string {
  return SOCIAL_PLACEHOLDERS[platform];
}

function WalletOption({
  description,
  disabled,
  icon,
  onPress,
  pending,
  title,
  variant,
}: {
  description: string;
  disabled: boolean;
  icon: ReactNode;
  onPress: () => void;
  pending: boolean;
  title: string;
  variant: "primary" | "outline";
}) {
  return (
    <Button
      className="h-auto w-full items-start justify-start gap-3 whitespace-normal px-3 py-3 text-left"
      isDisabled={disabled}
      onPress={onPress}
      variant={variant}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-background/15">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <span className="flex items-center gap-2 font-medium text-sm">
          {title}
          {pending ? <Spinner color="current" size="sm" /> : null}
        </span>
        <span className={variant === "primary" ? "text-xs opacity-75" : "text-muted text-xs"}>
          {description}
        </span>
      </span>
    </Button>
  );
}
