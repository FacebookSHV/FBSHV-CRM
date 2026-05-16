export type ContentIdea = {
  id: string;
  pageId: string;
  productSku?: string | null;
  template: string;
  title: string;
  caption: string;
  cta: string;
  mediaSuggestion: string;
  aiMode?: "ai" | "template";
  aiNotice?: string;
};

export type ContentPost = ContentIdea & {
  status: "draft" | "scheduled" | "published" | "failed" | "cancelled";
  scheduledAt?: string | null;
  updatedAt: string;
};

export type FacebookPage = {
  id: string;
  name: string;
  externalPageId: string;
  tokenStatus: string;
};

export type Suggestion = {
  date: string;
  suggestedTemplate: string;
  theme: string;
};

export type EditPostDraft = {
  id: string;
  title: string;
  caption: string;
  cta: string;
  scheduledAt: string;
};
