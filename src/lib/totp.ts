import crypto from "crypto";

// RFC 6238 (TOTP) / RFC 4226 (HOTP) implemented directly on Node's crypto
// module — same "no library unless needed" convention as
// resendWebhook.ts's hand-rolled Svix signature check. The only real
// building block missing from crypto is base32 (authenticator apps
// expect the secret in base32, not hex/base64), so that's hand-rolled
// too, below.
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;

function base32Encode(buffer: Buffer): string {
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    output += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  const remainder = bits.length % 5;
  if (remainder !== 0) {
    const lastChunk = bits.slice(bits.length - remainder).padEnd(5, "0");
    output += BASE32_ALPHABET[parseInt(lastChunk, 2)];
  }
  return output;
}

function base32Decode(encoded: string): Buffer {
  const clean = encoded.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

// A fresh random secret for a new enrollment — 20 bytes (160 bits) is the
// standard TOTP secret length every authenticator app expects.
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secretBytes: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", secretBytes).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binCode % 1_000_000).padStart(6, "0");
}

export function generateTotpCode(secretBase32: string, time: number = Date.now()): string {
  const counter = Math.floor(time / 1000 / STEP_SECONDS);
  return hotp(base32Decode(secretBase32), counter);
}

// Accepts a code from the current 30s window or one step before/after
// (±30s), to tolerate ordinary clock drift between the server and the
// user's phone — the same tolerance window Google Authenticator/Authy
// themselves assume servers use.
export function verifyTotpCode(secretBase32: string, code: string, time: number = Date.now()): boolean {
  const cleanCode = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleanCode)) return false;
  const secretBytes = base32Decode(secretBase32);
  const counter = Math.floor(time / 1000 / STEP_SECONDS);
  for (let delta = -1; delta <= 1; delta++) {
    if (hotp(secretBytes, counter + delta) === cleanCode) return true;
  }
  return false;
}

// The otpauth:// URI authenticator apps scan as a QR code to add an
// account — see https://github.com/google/google-authenticator/wiki/Key-Uri-Format.
export function otpAuthUrl(secretBase32: string, accountLabel: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// Recovery codes for a lost authenticator device — human-typeable
// (uppercase letters/digits, grouped for readability), returned as
// plaintext for the caller to show once and hash before storing (see
// hashToken in auth.ts).
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return codes;
}
