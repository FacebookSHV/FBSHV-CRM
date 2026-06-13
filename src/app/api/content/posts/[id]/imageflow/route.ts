import { fail, failFromError, ok } from "@/lib/api-response";
import { queueContentPostImageflow } from "@/lib/content-imageflow";
import { listContentPosts } from "@/lib/content-planner";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const post = (await listContentPosts()).find((item) => item.id === id);
    if (!post) return fail("Không tìm thấy bài viết.", 404, "CONTENT_POST_NOT_FOUND");
    if (!post.productSku) return fail("Bài viết chưa có sản phẩm.", 400, "CONTENT_PRODUCT_SKU_REQUIRED");

    return ok({ imageflowJob: await queueContentPostImageflow(post) });
  } catch (error) {
    return failFromError(error);
  }
}
