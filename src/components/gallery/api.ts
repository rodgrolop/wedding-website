// Shared API base for the guest-photos feature. Same-origin `/api` in
// production (App Platform ingress). Override for local dev with VITE_GALLERY_API.
const env = import.meta.env as Record<string, string | undefined>;
export const API_BASE = env.VITE_GALLERY_API || "/api";

export type PhotoState = "pending" | "rejected" | "approved";

export type Photo = {
  key: string;
  url: string;
  at: string;
  state?: PhotoState;
};
