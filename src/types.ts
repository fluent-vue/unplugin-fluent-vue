interface ExternalPluginOptionsBase {
  locales: string[]
  checkSyntax?: boolean
}

interface ExternalPluginOptionsFolder extends ExternalPluginOptionsBase {
  baseDir: string
  ftlDir: string
}

interface ExternalPluginOptionsFunction extends ExternalPluginOptionsBase {
  getFtlPath: (locale: string, vuePath: string) => string
}

export type ExternalPluginOptions = ExternalPluginOptionsFolder | ExternalPluginOptionsFunction

export interface SFCPluginOptions {
  blockType?: string
  checkSyntax?: boolean
}

export interface InsertInfo {
  insertPos: number
  target: string
}
