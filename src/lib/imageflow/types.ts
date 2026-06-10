import type { ProductWithInventory } from "@/lib/ecommerce/types";

export type ImageflowJobStatus = "queued" | "running" | "needs_user" | "completed" | "failed" | "cancelled";
export type ImageflowAssetStatus = "uploaded" | "needs_review" | "approved" | "rejected";

export type ImageflowJob = {
  id: string;
  workspaceId: string;
  postId: string | null;
  productSku: string;
  title: string;
  status: ImageflowJobStatus;
  targetFormat: string;
  targetAspectRatio: string;
  outputWidth: number;
  outputHeight: number;
  requestedCount: number;
  promptJson: string;
  productContextJson: string;
  resultManifestJson: string;
  error: string | null;
  lockedBy: string | null;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  product?: ProductWithInventory | null;
  assets?: ImageflowAsset[];
};

export type ImageflowAsset = {
  id: string;
  workspaceId: string;
  jobId: string;
  postId: string | null;
  mediaId: string | null;
  assetIndex: number;
  role: string;
  status: ImageflowAssetStatus;
  fileName: string;
  mimeType: string;
  fileSize: number;
  r2Key: string | null;
  publicUrl: string | null;
  promptJson: string;
  createdAt: string;
};

export type CreateImageflowJobInput = {
  postId?: string | null;
  productSku: string;
  title?: string;
  targetFormat?: string;
  targetAspectRatio?: string;
  outputWidth?: number;
  outputHeight?: number;
  requestedCount?: number;
  promptJson?: unknown;
  productContextJson?: unknown;
};

export type ImageflowJobPatch = Partial<{
  status: ImageflowJobStatus;
  error: string | null;
  resultManifestJson: unknown;
}>;

export type UploadedImageflowAssetInput = {
  file: File;
  assetIndex?: number;
  role?: string;
  promptJson?: unknown;
};
