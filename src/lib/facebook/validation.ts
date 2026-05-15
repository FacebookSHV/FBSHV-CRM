import { z } from "zod";

export const facebookPageParamSchema = z.object({
  id: z.string().trim().min(1)
});

export const disconnectSchema = z.object({
  pageId: z.string().trim().min(1).optional()
});

export const sendMessageSchema = z.object({
  conversationId: z.string().trim().min(1),
  message: z.string().trim().min(1).max(2000)
});

export const replyCommentSchema = z.object({
  commentId: z.string().trim().min(1),
  message: z.string().trim().min(1).max(2000)
});

export const hideCommentSchema = z.object({
  commentId: z.string().trim().min(1),
  hidden: z.boolean().default(true)
});
