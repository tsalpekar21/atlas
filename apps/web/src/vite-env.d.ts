/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PATIENT_TRIAGE_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
