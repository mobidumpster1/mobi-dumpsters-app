import crypto from "crypto";

const TOLERANCE_SECONDS = 5 * 60;

// Resend signs webhooks using Svix's scheme: HMAC-SHA256 over
// "{svix-id}.{svix-timestamp}.{raw body}", keyed by the base64 portion of
// the whsec_ secret, base64-encoded. The header can carry multiple
// space-separated "v1,<sig>" candidates — matching any one is valid.
// See https://docs.svix.com/receiving/verifying-payloads/how-manual
export function verifyResendWebhookSignature(
  secret: string,
  headers: { id: string; timestamp: string; signature: string },
  rawBody: string
): boolean {
  const timestamp = Number(headers.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) {
    return false;
  }

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  const expectedBuffer = Buffer.from(expected);

  return headers.signature
    .split(" ")
    .map((entry) => entry.split(",")[1])
    .filter((candidate): candidate is string => Boolean(candidate))
    .some((candidate) => {
      const candidateBuffer = Buffer.from(candidate);
      return (
        candidateBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(candidateBuffer, expectedBuffer)
      );
    });
}
