interface ImportMetaEnv {
  readonly PUBLIC_MAPBOX_TOKEN?: string
  readonly PUBLIC_MAPTILER_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
