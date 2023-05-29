import { Dirent, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { basename, dirname, extname, format, join, relative, sep } from "node:path"
import ts from "typescript"
import { RootNode, fileToAst } from "./parser/ast.js"

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
  targetDir: string

  /**
   * The renderer configuration.
   */
  renderer: Renderer

  /**
   * If `true`, all contents from the output directory will be removed before
   * regenerating files. This setting overwrites the setting from the generator
   * options.
   */
  clean?: boolean
}

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
   * If `true`, all contents from all output directories will be removed before
   * regenerating files. This setting may be overwritten for each output.
   */
  clean?: boolean

  /**
   * If `true`, it logs every successful conversion, including the source and
   * output file paths.
   */
  verbose?: boolean

  /**
   * A predicate that if defined only outputs files for the source files that
   * match the predicate.
   */
  fileNamePredicate?: (fileName: string) => boolean
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
    clean = false,
    fileNamePredicate,
    verbose = false
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

  outputs.forEach(({ targetDir, clean: cleanSingle }) => {
    if ((cleanSingle ?? clean) && existsSync(targetDir)) {
      rmSync(targetDir, { recursive: true })
    }

    mkdirSync(targetDir, { recursive: true })
  })

  const rootFiles = program
    .getSourceFiles()
    .filter(file => tsFiles.includes(file.fileName))

  const filteredFiles =
    fileNamePredicate
    ? rootFiles.filter(file => fileNamePredicate(file.fileName))
    : rootFiles

  console.log(`Generating files for ${filteredFiles.length} input file(s) and ${outputs.length} output format(s) ...`)

  filteredFiles.forEach(file => {
    const relativePath = relative(sourceDir, file.fileName)
    const dir          = dirname(relativePath)
    const name         = basename(relativePath).replace(/(?:\.d)?\.ts$/, "")

    try {
      if (verbose) {
        console.log(`Generating output for "${relativePath}" ...`)
      }

      const ast = fileToAst(file, checker, program)

      if (Object.keys(ast.elements).length > 0) {
        if (dumpAst) {
          writeFileSync(`${file.fileName}.ast.json`, JSON.stringify(ast, undefined, 2))
        }

        outputs.forEach(({ targetDir, renderer: { transformer, fileExtension } }) => {
          const outputDir = join(targetDir, dir)

          mkdirSync(outputDir, { recursive: true })

          const outputAbsoluteFilePath = format({ dir: outputDir, name, ext: fileExtension })
          const outputRelativeFilePath = relative(targetDir, outputAbsoluteFilePath)

          const output = transformer(
            ast,
            {
              absolutePath: outputAbsoluteFilePath,
              relativePath: outputRelativeFilePath,
            }
          )

          writeFileSync(outputAbsoluteFilePath, output)

          if (verbose) {
            console.log(`-> ${outputAbsoluteFilePath}`)
          }
        })
      }
      else {
        if (verbose) {
          console.log(`file does not contain renderable content`)
        } else {
          console.log(`"${relativePath}" does not contain renderable content`)
        }
      }

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

  if (verbose) {
    console.log(`Generating ${filteredFiles.length * outputs.length} output file(s) finished successfully.`)
  } else {
    console.log(`Generated ${filteredFiles.length * outputs.length} output file(s).`)
  }
}
