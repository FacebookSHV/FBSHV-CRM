import type { ContentPost } from "@/lib/content-planner";
import { ensureImageflowJobForPost } from "@/lib/imageflow/store";

export async function queueContentPostImageflow(post: ContentPost) {
  if (!post.productSku) throw new Error("CONTENT_PRODUCT_SKU_REQUIRED");

  // NEO: Nút tạo ảnh của CRM chỉ xếp job theo postId vào Pool Scheduler.
  return ensureImageflowJobForPost({
    postId: post.id,
    productSku: post.productSku,
    title: `Ảnh bài đăng - ${post.title}`,
    targetFormat: "facebook_feed",
    targetAspectRatio: "4:5",
    outputWidth: 1080,
    outputHeight: 1350,
    requestedCount: 4,
    promptJson: {
      source: "content_planner",
      postId: post.id,
      channel: "facebook",
      goal: "Tạo ảnh bài đăng rõ sản phẩm, dễ đọc trên điện thoại, không thêm thông tin ngoài dữ liệu thật.",
      caption: post.caption,
      cta: post.cta
    }
  });
}
