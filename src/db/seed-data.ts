import { demoProducts } from "@/lib/demo-data";

export const seedWorkspace = {
  id: "workspace-demo",
  name: "Shop Huy Vân",
  slug: "shop-huy-van"
};

export const seedUser = {
  id: "user-demo",
  name: "Demo Admin",
  email: "admin@fbshv.local"
};

export const seedProducts = demoProducts.map((product) => ({
  ...product,
  workspaceId: seedWorkspace.id,
  externalProductId: product.id
}));
