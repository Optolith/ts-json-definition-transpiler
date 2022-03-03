import { Dirent, mkdirSync, readdirSync, writeFileSync } from "fs"
import { basename, dirname, extname, format, join, relative, sep } from "path"
import ts from "typescript"
import { fileToAst, RootNode } from "./ast.js"
import { jsonSchemaRenderer } from "./renderers/jsonSchema.js"
import { markdownRenderer } from "./renderers/markdown.js"

export type MetaInformation = {
  absolutePath: string
  relativePath: string
}

export type AstTransformer = (ast: RootNode, meta: MetaInformation) => string

export type Renderer = {
  transformer: AstTransformer
  fileExtension: string
}

export type Output = {
  folder: string
  renderer: Renderer
}

export const defaultRenderers = Object.freeze({
  jsonSchema: jsonSchemaRenderer,
  markdown: markdownRenderer,
})

export type GeneratorOptions = {
  sourceDir: string
  outputs: Output[]
  debug?: boolean
  filterFile?: (fileName: string) => boolean
}

export const generate = (options: GeneratorOptions): void => {
  const {
    sourceDir,
    outputs,
    debug = false,
    filterFile,
  } = options

  const flattenTypeScriptFileNamesFromDir = (dirPath: string): string[] => {
    const dirEntryToFilePath = (dirEntry: Dirent) =>
      join(dirPath, dirEntry.name).split(sep).join("/")

    return readdirSync(dirPath, { withFileTypes: true })
      .flatMap(dirEntry => {
        if (dirEntry.isDirectory()) {
          return flattenTypeScriptFileNamesFromDir(dirEntryToFilePath(dirEntry))
        }
        else if (dirEntry.isFile() && extname(dirEntry.name) === ".ts") {
          return [dirEntryToFilePath(dirEntry)]
        }
        else {
          return []
        }
      })
  }

  const tsFiles = flattenTypeScriptFileNamesFromDir(sourceDir)

  const program = ts.createProgram(tsFiles, { strict: true })

  // KEEP ALWAYS, SIDE EFFECT: it fills the parent references of nodes
  const checker = program.getTypeChecker()

  outputs.forEach(({ folder }) => mkdirSync(folder, { recursive: true }))

  const rootFiles = program
    .getSourceFiles()
    .filter(file => tsFiles.includes(file.fileName))

  const filteredFiles =
    filterFile
    ? rootFiles.filter(file => filterFile(file.fileName))
    : rootFiles

  filteredFiles.forEach(file => {
    const relativePath = relative(sourceDir, file.fileName)
    const dir          = dirname(relativePath)
    const name         = basename(relativePath, ".ts")

    try {
      const ast = fileToAst(file, checker)

      if (debug) {
        writeFileSync(`${file.fileName}.ast.json`, JSON.stringify(ast, undefined, 2))
      }

      outputs.forEach(({ folder, renderer: { transformer, fileExtension } }) => {
        const outputDir = join(folder, dir)

        mkdirSync(outputDir, { recursive: true })

        const outputAbsoluteFilePath = format({ dir: outputDir, name, ext: fileExtension })
        const outputRelativeFilePath = relative(folder, outputAbsoluteFilePath)

        const output = transformer(
          ast,
          {
            absolutePath: outputAbsoluteFilePath,
            relativePath: outputRelativeFilePath,
          }
        )

        writeFileSync(outputAbsoluteFilePath, output)
      })
    } catch (error) {
      if (error instanceof Error) {
        error.message = `${error.message} in TS file "${file.fileName}"`
        throw error
      }
      else {
        throw error
      }
    }
  })
}
