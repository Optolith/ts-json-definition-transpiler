// @ts-check
import * as assert from "node:assert/strict"
import { sep } from "node:path"
import { dirname, join } from "node:path/posix"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { fileToAst, NodeKind, TokenKind } from "../../lib/parser/ast.js"

describe("ast", () => {
  it("should treat a record with defaulted type parameters as record without type parameters for output", () => {
    const { checker, program } = prepareTypeScriptInstance(["typeParameterWithDefaults.ts"])
    const file = /** @type {import("typescript").SourceFile} */ (program.getSourceFiles().find(file => file.fileName.includes("typeParameterWithDefaults")))
    const actual = fileToAst(file, checker, program)

    /** @type {import("../../src/parser/ast.js").RootNode} */
    const expected = {
      kind: NodeKind.Main,
      jsDoc: undefined,
      elements: {
        Record: {
          kind: NodeKind.Record,
          jsDoc: undefined,
          elements: {
            id: {
              isRequired: true,
              jsDoc: undefined,
              value: {
                kind: NodeKind.Token,
                jsDoc: undefined,
                token: TokenKind.Number
              }
            }
          }
        }
      }
    }

    assert.deepEqual(actual, expected)
  })
})

/**
 * @param {string[]} filePaths
 * @return {{ checker: ts.TypeChecker; program: ts.Program }}
 */
const prepareTypeScriptInstance = filePaths => {
  const root = join(dirname(fileURLToPath(import.meta.url).split(sep).join("/")), "files")
  const program = ts.createProgram(filePaths.map(file => join(root, file)), { strict: true })
  const checker = program.getTypeChecker()
  return { program, checker }
}
