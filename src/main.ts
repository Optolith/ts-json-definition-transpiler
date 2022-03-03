import { Dirent, mkdirSync, readdirSync, writeFileSync } from "fs"
import { basename, dirname, extname, format, join, relative, sep } from "path"
import ts from "typescript"
import { fileToAst, RootNode } from "./ast.js"
import { jsonSchemaRenderer } from "./renderers/jsonSchema.js"
import { markdownRenderer } from "./renderers/markdown.js"

export type MetaInformation = {
  /**
   * The absolute path to the output file.
   */
  absolutePath: string

  /**
   * The path to the output file relative to the output root directory.
   */
  relativePath: string
}

/**
 * A function that takes the custom AST and some meta information about the
 * current source file and returns the content of the output file to be written.
 */
export type AstTransformer = (ast: RootNode, meta: MetaInformation) => string

/**
 * A renderer is specified by an AST transformer and the file extension, since
 * the file extension is used for the output paths received by the transformer.
 */
export type Renderer = {
  /**
   * The AST transformer for a single file.
   */
  transformer: AstTransformer

  /**
   * The file extension the output files should use, e.g. `.md`.
   */
  fileExtension: string
}

/**
 * An output configuration.
 */
export type Output = {
  /**
   * The absolute folder path rendered files should be written to.
   */
  folder: string

  /**
   * The renderer configuration.
   */
  renderer: Renderer
}

/**
 * A dictionary of renderers that ship with this package.
 */
export const defaultRenderers = Object.freeze({
  jsonSchema: jsonSchemaRenderer,
  markdown: markdownRenderer,
})

/**
 * The generator options.
 */
export type GeneratorOptions = {
  /**
   * The absolute path to the source directory of the TypeScript files.
   */
  sourceDir: string

  /**
   * An array of all output format configurations.
   */
  outputs: Output[]

  /**
   * If set to `true`, the internal AST will be output for each source file as
   * a JSON file. So for a `Source.ts` file, a corresponding
   * `Source.ts.ast.json` file will be generated in the same folder.
   */
  dumpAst?: boolean

  /**
   * A predicate that if defined only outputs files for the source files that
   * match the predicate.
   */
  filterFile?: (fileName: string) => boolean
}

/**
 * For each file in the specified source directory and its subdirectories,
 * generate a file for each output in the respective specified output directory
 * with the same relative path as in the source directory.
 *
 * @param options - The generator options.
 */
export const generate = (options: GeneratorOptions): void => {
  const {
    sourceDir,
    outputs,
    dumpAst = false,
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

  console.log(`Generating files for ${filteredFiles.length} input file(s) and ${outputs.length} output format(s) ...`)

  filteredFiles.forEach(file => {
    const relativePath = relative(sourceDir, file.fileName)
    const dir          = dirname(relativePath)
    const name         = basename(relativePath, ".ts")

    try {
      console.log(`Generating output for "${relativePath}" ...`)

      const ast = fileToAst(file, checker)

      if (dumpAst) {
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

        console.log(`-> ${outputAbsoluteFilePath}`)
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

  console.log(`Generating ${filteredFiles.length * outputs.length} output file(s) finished successfully.`)
}
