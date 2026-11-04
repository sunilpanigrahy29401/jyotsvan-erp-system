/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INSFORGE_PROJECT_ID?: string;
  readonly VITE_INSFORGE_API_URL?: string;
  readonly VITE_INSFORGE_ANON_KEY?: string;
  readonly APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
