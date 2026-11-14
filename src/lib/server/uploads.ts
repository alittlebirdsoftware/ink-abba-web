import { randomUUID } from "node:crypto";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { UPLOAD_MAX_BYTES } from "@/lib/validate";
import { clientOptions, config } from "./config";

/** Keys this app issues. Submissions with any other key are rejected. */
export const UPLOAD_KEY = /^uploads\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,120}$/;

let client: S3Client | null = null;
const s3 = () => (client ??= new S3Client(clientOptions));

function safeName(filename: string) {
  const cleaned = filename.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-.]+/, "").slice(-120);
  return cleaned || "attachment";
}

/**
 * Returns a short-lived form the browser posts the file to directly, so
 * uploads never pass through the app. S3 enforces the size and type.
 */
export async function createUpload(filename: string, contentType: string) {
  if (!config.uploadsBucket) return null;
  const key = `uploads/${randomUUID()}/${safeName(filename)}`;
  const { url, fields } = await createPresignedPost(s3(), {
    Bucket: config.uploadsBucket,
    Key: key,
    Conditions: [
      ["content-length-range", 1, UPLOAD_MAX_BYTES],
      ["eq", "$Content-Type", contentType],
    ],
    Fields: { "Content-Type": contentType },
    Expires: 300,
  });
  return { url, fields, key };
}

export async function readUpload(key: string) {
  if (!config.uploadsBucket) return null;
  const object = await s3().send(new GetObjectCommand({ Bucket: config.uploadsBucket, Key: key }));
  if (!object.Body) return null;
  return {
    bytes: await object.Body.transformToByteArray(),
    contentType: object.ContentType ?? "application/octet-stream",
    filename: key.split("/").pop() ?? "attachment",
  };
}
