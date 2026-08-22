import { describe, expect, it } from "vitest";
import { PAYMENT_PROOF_MAX_BYTES, validatePaymentProof } from "./paymentProof";

const jpegDataUrl = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x01]).toString("base64")}`;
const pngDataUrl = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]).toString("base64")}`;

describe("payment proof validation", () => {
  it("accepts supported image data only when the encoded media type and file signature agree", () => {
    expect(validatePaymentProof({ originalFilename: "receipt screenshot.jpg", contentType: "image/jpeg", dataUrl: jpegDataUrl })).toMatchObject({ contentType: "image/jpeg", extension: "jpg", originalFilename: "receipt_screenshot.jpg" });
    expect(validatePaymentProof({ originalFilename: "receipt.png", contentType: "image/png", dataUrl: pngDataUrl })).toMatchObject({ contentType: "image/png", extension: "png" });
  });

  it("rejects a mismatched MIME/signature and oversized proof payload", () => {
    expect(() => validatePaymentProof({ originalFilename: "not-a-png.png", contentType: "image/png", dataUrl: jpegDataUrl.replace("image/jpeg", "image/png") })).toThrow(/declared type/i);
    const oversized = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(PAYMENT_PROOF_MAX_BYTES)]).toString("base64");
    expect(() => validatePaymentProof({ originalFilename: "oversized.jpg", contentType: "image/jpeg", dataUrl: `data:image/jpeg;base64,${oversized}` })).toThrow(/5 MB/i);
  });
});
