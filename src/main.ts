import { Dirent, mkdirSync, readdirSync, writeFileSync } from "fs"
import { basename, dirname, extname, format, join, relative, sep } from "path"
import * as ts from "typescript"
import { fileToAst } from "./ast"
import { astToJsonSchema, jsonSchemaToFileContent } from "./jsonSchema"
import { astToMarkdown } from "./markdown"

const getOptionValue = (name: string) => {
  const index = process.argv.indexOf(name)

  if (index > -1) {
    return process.argv[index + 1]
  }
}

const tsDir = getOptionValue("--tsdir")
const jsonSchemaDir = getOptionValue("--jsondir")
const mdDir = getOptionValue("--mddir")
const debug = process.argv.includes("--debug")

if (!tsDir || !jsonSchemaDir || !mdDir) {
  console.log(`\
Usage:

node -r ts-node/register/transpile-only src/main.ts --tsdir "src/entity" --jsondir "json" --mddir "docs"`)
}
else {
  const fromCLIPath = (path: string) => join(...path.split(/[\/\\]/))
  const toForwardSlashPath = (path: string) => path.split(sep).join("/")

  const toAbsolutePath = (relativePath: string) => join(__dirname, "..", relativePath)

  const absolutePathFromCLI = (path: string) => toAbsolutePath(fromCLIPath(path))

  const typesRootPath = absolutePathFromCLI(tsDir)
  const jsonSchemaRootPath = absolutePathFromCLI(jsonSchemaDir)
  const markdownRootPath = absolutePathFromCLI(mdDir)

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

  const tsFiles = flattenTypeScriptFileNamesFromDir(typesRootPath)

  const program = ts.createProgram(tsFiles, { strict: true })

  // KEEP ALWAYS, SIDE EFFECT: it fills the parent references of nodes
  const checker = program.getTypeChecker()

  mkdirSync(jsonSchemaRootPath, { recursive: true })
  mkdirSync(markdownRootPath,   { recursive: true })

  program
    .getSourceFiles()
    .filter(file => tsFiles.includes(file.fileName))
    // .filter(file => file.fileName.includes("_Prerequisite"))
    .forEach(file => {
      const relativePath = relative(typesRootPath, file.fileName)
      const dir          = dirname(relativePath)
      const name         = basename(relativePath, ".ts")

      const jsonSchemaDir = join(jsonSchemaRootPath, dir)
      const markdownDir   = join(markdownRootPath, dir)

      mkdirSync(jsonSchemaDir, { recursive: true })
      mkdirSync(markdownDir,   { recursive: true })

      const jsonSchemaFilePath = format({ dir: jsonSchemaDir, name, ext: ".schema.json" })
      const jsonSchemaId       = toForwardSlashPath(relative(jsonSchemaRootPath, jsonSchemaFilePath))
      const markdownFilePath   = format({ dir: markdownDir,   name, ext: ".md" })

      try {
        const ast    = fileToAst(file, checker)
        const schema = jsonSchemaToFileContent(astToJsonSchema(ast, jsonSchemaId))
        const docs   = astToMarkdown(ast)

        if (debug) {
          writeFileSync(`${file.fileName}.ast.json`, JSON.stringify(ast, undefined, 2))
        }

        writeFileSync(jsonSchemaFilePath, schema)
        writeFileSync(markdownFilePath, docs)
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
