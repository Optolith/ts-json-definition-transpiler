import { Dirent, mkdirSync, readdirSync, writeFileSync } from "fs"
import { basename, extname, join, sep } from "path"
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

if (!tsDir || !jsonSchemaDir || !mdDir) {
  console.log(`\
Usage:

node -r ts-node/register/transpile-only createSchema.ts --tsdir "src/entity" --jsondir "json" --mddir "docs"`)
}
else {
  const prepareSplitCLIPath = (path: string) => path.split(/[\/\\]/)
  const toAbsolutePath = (relativePath: string[]) =>
    join(__dirname, "..", relativePath.join(sep)).split(sep)
  const joinPath = (path: string[]) => path.join(sep)
  const splitPath = (path: string) => path.split(sep)
  const makeAbsolutePathSplit = (path: string) => toAbsolutePath(prepareSplitCLIPath(path))

  const rootPaths = joinPath(makeAbsolutePathSplit(tsDir))

  const dirEntryToFilePath = (dirEntry: Dirent) =>
    join(rootPaths, dirEntry.name).split(sep).join("/")

  const tsFiles = readdirSync(rootPaths, { withFileTypes: true })
    .flatMap(dirEntry => {
      if (dirEntry.isFile() && extname(dirEntry.name) === ".ts") {
        return [dirEntryToFilePath(dirEntry)]
      }
      else {
        return []
      }
    })

  const program = ts.createProgram(tsFiles, { strict: true })

  // KEEP ALWAYS, SIDE EFFECT: it fills the parent references of nodes
  const checker = program.getTypeChecker()

  const jsonSchemaRoot = makeAbsolutePathSplit(jsonSchemaDir)
  const markdownRoot = makeAbsolutePathSplit(mdDir)

  mkdirSync(jsonSchemaRoot.join(sep), { recursive: true })
  mkdirSync(markdownRoot.join(sep), { recursive: true })

  program
    .getSourceFiles()
    .filter(file => tsFiles.includes(file.fileName))
    .forEach(file => {
      const base = basename(file.fileName, ".ts")
      const schemaFilePath = [...jsonSchemaRoot, `${base}.schema.json`]
      const schemaId = [
        ...prepareSplitCLIPath(jsonSchemaDir).filter(part => part !== "." && part !== ".."),
        `${base}.schema.json`
      ].join("/")
      const markdownFilePath = [...markdownRoot, `${base}.md`]

      try {
        const ast = fileToAst(file, checker)
        const schema = jsonSchemaToFileContent(astToJsonSchema(ast, schemaId))
        const docs = astToMarkdown(ast)

        writeFileSync(schemaFilePath.join(sep), schema)
        writeFileSync(markdownFilePath.join(sep), docs)
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
