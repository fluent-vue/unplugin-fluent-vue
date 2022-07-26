export interface ExternalPluginOptions {
  baseDir: string
  ftlDir: string
  locales: string[]
}

export interface SFCPluginOptions {
  blockType: string
}

export interface InsertInfo {
  insertPos: number
  target: string
}
