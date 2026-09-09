"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/Field";
import {
  startTwoFactorEnrollment,
  confirmTwoFactorEnrollment,
  cancelTwoFactorEnrollment,
  disableTwoFactor,
} from "./twoFactorActions";

type Step = "idle" | "scanning" | "backupCodes";

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Disable flow
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableError, setDisableError] = useState<string | null>(null);
  const [disabling, setDisabling] = useState(false);

  async function handleStart() {
    setBusy(true);
    setError(null);
    try {
      const result = await startTwoFactorEnrollment();
      setQrDataUrl(result.qrDataUrl);
      setSecret(result.secret);
      setStep("scanning");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start setup.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("code", code);
      const result = await confirmTwoFactorEnrollment(formData);
      setBackupCodes(result.backupCodes);
      setStep("backupCodes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't confirm that code.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    setBusy(true);
    try {
      await cancelTwoFactorEnrollment();
    } finally {
      setStep("idle");
      setQrDataUrl(null);
      setSecret(null);
      setCode("");
      setError(null);
      setBusy(false);
    }
  }

  function handleDone() {
    setStep("idle");
    setBackupCodes(null);
    router.refresh();
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setDisabling(true);
    setDisableError(null);
    try {
      const formData = new FormData();
      formData.set("password", disablePassword);
      await disableTwoFactor(formData);
      setShowDisable(false);
      setDisablePassword("");
      router.refresh();
    } catch (err) {
      setDisableError(err instanceof Error ? err.message : "Couldn't disable 2FA.");
    } finally {
      setDisabling(false);
    }
  }

  if (enabled && step !== "backupCodes") {
    return (
      <div>
        <p className="text-sm text-zinc-700">
          <span className="font-semibold text-green-700">Enabled.</span> You&apos;ll be asked
          for a code from your authenticator app each time you sign in.
        </p>
        {!showDisable ? (
          <button
            type="button"
            onClick={() => setShowDisable(true)}
            className="mt-3 text-sm font-semibold text-red-600 hover:underline"
          >
            Disable Two-Factor Authentication
          </button>
        ) : (
          <form onSubmit={handleDisable} className="mt-3 flex flex-col gap-3 rounded-xl border border-zinc-200 p-3">
            <Field label="Confirm your password to disable" htmlFor="disablePassword">
              <input
                id="disablePassword"
                type="password"
                autoComplete="current-password"
                required
                className={inputClass}
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
            </Field>
            {disableError && <p className="text-sm text-red-600">{disableError}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={disabling}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {disabling ? "Disabling…" : "Confirm Disable"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDisable(false);
                  setDisableError(null);
                }}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  if (step === "backupCodes" && backupCodes) {
    return (
      <div>
        <p className="text-sm font-bold text-amber-800">
          Save these backup codes somewhere safe — each works once, if you ever lose your
          authenticator device. They won&apos;t be shown again.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 font-mono text-sm">
          {backupCodes.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <button
          type="button"
          onClick={handleDone}
          className="mt-4 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          I&apos;ve saved these codes
        </button>
      </div>
    );
  }

  if (step === "scanning" && qrDataUrl) {
    return (
      <div>
        <p className="text-sm text-zinc-700">
          Scan this with Google Authenticator, Authy, or any TOTP app, then enter the 6-digit
          code it shows.
        </p>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- a data: URL, not a static asset next/image can optimize */}
          <img src={qrDataUrl} alt="Two-factor setup QR code" width={160} height={160} className="rounded-lg border border-zinc-200" />
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Can&apos;t scan? Enter this key manually:</p>
            <code className="mt-1 block break-all rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
              {secret}
            </code>
          </div>
        </div>
        <form onSubmit={handleConfirm} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Field label="6-Digit Code" htmlFor="confirmCode">
              <input
                id="confirmCode"
                inputMode="numeric"
                placeholder="123456"
                required
                autoFocus
                className={`${inputClass} text-center tracking-widest`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? "Verifying…" : "Verify & Enable"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Not enabled. Add a code from an authenticator app as a second step when signing in.
      </p>
      <button
        type="button"
        onClick={handleStart}
        disabled={busy}
        className="mt-3 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {busy ? "Starting…" : "Enable Two-Factor Authentication"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
