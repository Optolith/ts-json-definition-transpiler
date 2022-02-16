import { Dirent, mkdirSync, readdirSync, writeFileSync } from "fs"
import { basename, extname, join, sep } from "path"
import * as ts from "typescript"
import { fileToAst } from "./ast"
import { astToJsonSchema } from "./jsonSchema"
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
  const prepareArgumentPath = (path: string) =>
    join(__dirname, "..", path.split(/[\/\\]/).join(sep))

  const prepareArgumentPathSplit = (path: string) =>
    prepareArgumentPath(path).split(sep)

  const rootPaths = prepareArgumentPath(tsDir)

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

  // KEEP, SIDE EFFECT: it fills the parent references of nodes
  program.getTypeChecker()

  const jsonSchemaRoot = prepareArgumentPathSplit(jsonSchemaDir)
  const markdownRoot = prepareArgumentPathSplit(mdDir)

  mkdirSync(jsonSchemaRoot.join(sep), { recursive: true })
  mkdirSync(markdownRoot.join(sep), { recursive: true })

  program
    .getSourceFiles()
    .filter(file => tsFiles.includes(file.fileName))
    // .filter(file => file.fileName.includes("_PublicationRef.ts"))
    .forEach(file => {
      const schemaFilePath = [...jsonSchemaRoot, `${basename(file.fileName, ".ts")}.schema.json`]
      const markdownFilePath = [...markdownRoot, `${basename(file.fileName, ".ts")}.md`]

      try {
        const ast = fileToAst(file)
        const schema = astToJsonSchema(ast, schemaFilePath.join("/"))
        const docs = astToMarkdown(ast)

        writeFileSync(schemaFilePath.join(sep), JSON.stringify(schema, undefined, 2))
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
