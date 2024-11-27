import { Dirent } from "node:fs"
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises"
import {
  basename,
  dirname,
  extname,
  format,
  join,
  relative,
  sep,
} from "node:path"
import ts from "typescript"
import { RootNode } from "./ast.js"
import { fileToAst } from "./parser/ast.js"
import { resolveTypeArgumentsForFile } from "./parser/resolvetypeargs.js"
import { tsextPattern } from "./utils/path.js"

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
export type AstTransformer = (
  ast: RootNode,
  meta: MetaInformation
) => string | undefined

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

  /**
   * If `true`, the root node will have its type parameters resolved and thus
   * removed.
   */
  resolveTypeParameters?: boolean
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
export const generate = async (options: GeneratorOptions): Promise<void> => {
  const {
    sourceDir,
    outputs,
    dumpAst = false,
    clean = false,
    fileNamePredicate,
    verbose = false,
  } = options

  const flattenTypeScriptFileNamesFromDir = async (
    dirPath: string
  ): Promise<string[]> => {
    const dirEntryToFilePath = (dirEntry: Dirent) =>
      join(dirPath, dirEntry.name).split(sep).join("/")

    const entries = await readdir(dirPath, { withFileTypes: true })

    return (
      await Promise.all(
        entries.map(async (dirEntry) => {
          if (dirEntry.isDirectory()) {
            return flattenTypeScriptFileNamesFromDir(
              dirEntryToFilePath(dirEntry)
            )
          } else if (dirEntry.isFile() && extname(dirEntry.name) === ".ts") {
            return [dirEntryToFilePath(dirEntry)]
          } else {
            return []
          }
        })
      )
    ).flat()
  }

  const tsFiles = await flattenTypeScriptFileNamesFromDir(sourceDir)

  const program = ts.createProgram(tsFiles, { strict: true })

  // KEEP ALWAYS, SIDE EFFECT: it fills the parent references of nodes
  const checker = program.getTypeChecker()

  for (const { targetDir } of outputs) {
    await mkdir(targetDir, { recursive: true })
  }

  const filesToCleanUp = await Promise.all(
    outputs.map(({ targetDir }) => readdir(targetDir, { recursive: true }))
  )

  const removeFileFromCleanUp = (outputIndex: number, path: string) => {
    filesToCleanUp[outputIndex] = filesToCleanUp[outputIndex]!.filter(
      (existingPath) => existingPath !== path
    )
  }

  const rootFiles = program
    .getSourceFiles()
    .filter((file) => tsFiles.includes(file.fileName))

  const rootFilesAsts = Object.fromEntries(
    rootFiles.map((file) => [file.fileName, fileToAst(file, checker, program)])
  )

  const filteredFiles = fileNamePredicate
    ? rootFiles.filter((file) => fileNamePredicate(file.fileName))
    : rootFiles

  console.log(
    `Generating files for ${filteredFiles.length} input file(s) and ${outputs.length} output format(s) ...`
  )

  let outputFilesCount = 0

  for (const file of filteredFiles) {
    const relativePath = relative(sourceDir, file.fileName)
    const dir = dirname(relativePath)
    const name = basename(relativePath).replace(tsextPattern, "")

    try {
      if (verbose) {
        console.log(`Generating output for "${relativePath}" ...`)
      }

      const ast = rootFilesAsts[file.fileName]!
      const resolvedAst = resolveTypeArgumentsForFile(rootFilesAsts, ast)

      if (Object.keys(ast.children).length > 0) {
        if (dumpAst) {
          await writeFile(
            `${file.fileName}.ast.json`,
            JSON.stringify(ast, undefined, 2),
            "utf-8"
          )

          if (resolvedAst) {
            await writeFile(
              `${file.fileName}.ast.resolved.json`,
              JSON.stringify(ast, undefined, 2),
              "utf-8"
            )
          }
        }

        await Promise.all(
          outputs.map(async ({ targetDir, renderer }, outputIndex) => {
            const {
              transformer,
              fileExtension,
              resolveTypeParameters = false,
            } = renderer
            const outputDir = join(targetDir, dir)

            const outputAbsoluteFilePath = format({
              dir: outputDir,
              name,
              ext: fileExtension,
            })

            const outputRelativeFilePath = relative(
              targetDir,
              outputAbsoluteFilePath
            )

            const meta: MetaInformation = {
              absolutePath: outputAbsoluteFilePath,
              relativePath: outputRelativeFilePath,
            }

            const output = resolveTypeParameters
              ? resolvedAst !== undefined
                ? transformer(resolvedAst, meta)
                : undefined
              : transformer(ast, meta)

            if (output === undefined) {
              if (verbose) {
                console.log(`-> empty output`)
              }
            } else {
              await mkdir(outputDir, { recursive: true })
              await writeFile(outputAbsoluteFilePath, output, "utf-8")
              outputFilesCount++

              removeFileFromCleanUp(outputIndex, outputRelativeFilePath)

              if (verbose) {
                console.log(`-> ${outputAbsoluteFilePath}`)
              }
            }
          })
        )
      } else {
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
      } else {
        throw error
      }
    }
  }

  await Promise.all(
    outputs.map(async ({ targetDir, clean: cleanSingle }, outputIndex) => {
      if (cleanSingle ?? clean) {
        await Promise.all(
          filesToCleanUp[outputIndex]!.map(async (filePath) => {
            const absolutePath = join(targetDir, filePath)
            const stats = await stat(absolutePath)
            if (
              !stats.isDirectory() ||
              (await readdir(absolutePath)).length === 0
            ) {
              await rm(join(targetDir, filePath), { recursive: true })
            }
          })
        )
      }
    })
  )

  if (verbose) {
    console.log(
      `Generating ${outputFilesCount} output file(s) finished successfully.`
    )
  } else {
    console.log(`Generated ${outputFilesCount} output file(s).`)
  }
}
