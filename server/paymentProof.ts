import { storagePut } from "./storage";

export const PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const PAYMENT_PROOF_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PaymentProofMimeType = typeof PAYMENT_PROOF_MIME_TYPES[number];

export type PaymentProofInput = {
  originalFilename: string;
  contentType: PaymentProofMimeType;
  dataUrl: string;
};

type ValidatedPaymentProof = Omit<PaymentProofInput, "dataUrl"> & { bytes: Buffer; extension: "jpg" | "png" | "webp" };

function matchesSignature(contentType: PaymentProofMimeType, bytes: Buffer) {
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

export function validatePaymentProof(input: PaymentProofInput): ValidatedPaymentProof {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(input.dataUrl);
  if (!match || match[1] !== input.contentType) throw new Error("Payment proof must be a valid JPEG, PNG, or WebP image");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > PAYMENT_PROOF_MAX_BYTES) throw new Error("Payment proof image must be 5 MB or smaller");
  if (!matchesSignature(input.contentType, bytes)) throw new Error("Payment proof image content does not match its declared type");
  const originalFilename = input.originalFilename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 180) || "payment-proof";
  const extension = input.contentType === "image/jpeg" ? "jpg" : input.contentType === "image/png" ? "png" : "webp";
  return { originalFilename, contentType: input.contentType, bytes, extension };
}

export async function storePaymentProof(userId: number, input: PaymentProofInput) {
  const proof = validatePaymentProof(input);
  const keyPrefix = `payment-proofs/${userId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}`;
  const stored = await storagePut(`${keyPrefix}.${proof.extension}`, proof.bytes, proof.contentType);
  return { storageKey: stored.key, storageUrl: stored.url, contentType: proof.contentType, originalFilename: proof.originalFilename, byteSize: proof.bytes.length };
}
