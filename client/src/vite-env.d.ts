/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Base URL of the backend API. Set on Vercel for production; falls back to
  // the local dev server when unset.
  readonly VITE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
