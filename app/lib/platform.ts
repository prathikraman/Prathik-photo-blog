import { env } from "cloudflare:workers";

export type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }>;
  run(): Promise<unknown>;
};
export type D1Database = { prepare(query: string): D1PreparedStatement; batch(statements: D1PreparedStatement[]): Promise<unknown[]> };
export type R2ObjectBody = { body: ReadableStream; httpMetadata?: { contentType?: string }; writeHttpMetadata(headers: Headers): void };
export type R2UploadedPart = { partNumber: number; etag: string };
export type R2MultipartUpload = {
  uploadPart(partNumber: number, value: ArrayBuffer): Promise<R2UploadedPart>;
  complete(parts: R2UploadedPart[]): Promise<unknown>;
  abort(): Promise<void>;
};
export type R2Bucket = {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
  createMultipartUpload(key: string, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<R2MultipartUpload & { uploadId: string }>;
  resumeMultipartUpload(key: string, uploadId: string): R2MultipartUpload;
};
export type AppEnv = { DB?: D1Database; PHOTOS?: R2Bucket };
export const getPlatformEnv = () => env as unknown as AppEnv;
