/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HOST_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
