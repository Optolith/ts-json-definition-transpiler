import * as assert from "node:assert/strict"
import { normalize, sep } from "node:path"
import { dirname, join } from "node:path/posix"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { NodeKind, RootNode, TokenKind } from "../../src/ast.js"
import { fileToAst } from "../../src/parser/ast.js"

const prepareTypeScriptInstance = (
  filePaths: string[][]
): { checker: ts.TypeChecker; program: ts.Program; root: string } => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "files")
  const program = ts.createProgram(
    filePaths.map((file) => join(root, ...file)),
    { strict: true }
  )
  const checker = program.getTypeChecker()
  return { program, checker, root }
}

describe("fileToAst", () => {
  const { checker, program, root } = prepareTypeScriptInstance([
    ["a.ts"],
    ["b.ts"],
  ])
  const a = program
    .getSourceFiles()
    .find((file) => normalize(file.fileName).endsWith(sep + "a.ts"))!
  const b = program
    .getSourceFiles()
    .find((file) => normalize(file.fileName).endsWith(sep + "b.ts"))!

  it("transforms the content into a custom ast (a.ts)", () => {
    const actual = fileToAst(a, checker, program)

    assert.deepEqual<RootNode>(actual, {
      kind: NodeKind.Root,
      fileName: a.fileName,
      jsDoc: undefined,
      imports: [],
      children: [
        {
          kind: NodeKind.TypeDefinition,
          fileName: a.fileName,
          jsDoc: undefined,
          name: "A",
          typeParameters: [
            {
              kind: NodeKind.TypeParameter,
              fileName: a.fileName,
              name: "T",
              constraint: {
                kind: NodeKind.Token,
                fileName: a.fileName,
                jsDoc: undefined,
                token: TokenKind.Number,
              },
              default: {
                kind: NodeKind.Token,
                fileName: a.fileName,
                jsDoc: undefined,
                token: TokenKind.Number,
              },
            },
          ],
          definition: {
            kind: NodeKind.Record,
            fileName: a.fileName,
            jsDoc: undefined,
            children: {
              id: {
                isReadOnly: false,
                isRequired: true,
                jsDoc: undefined,
                value: {
                  kind: NodeKind.Reference,
                  fileName: a.fileName,
                  jsDoc: undefined,
                  name: { segment: "T", right: undefined },
                  typeArguments: undefined,
                  resolvedFileName: undefined,
                },
              },
            },
          },
        },
        {
          kind: NodeKind.TypeDefinition,
          fileName: a.fileName,
          jsDoc: undefined,
          name: "Def",
          typeParameters: undefined,
          definition: {
            kind: NodeKind.Token,
            fileName: a.fileName,
            jsDoc: undefined,
            token: TokenKind.Number,
          },
        },
        {
          kind: NodeKind.ExportAssignment,
          fileName: a.fileName,
          jsDoc: undefined,
          name: "default",
          expression: {
            kind: NodeKind.Reference,
            fileName: a.fileName,
            jsDoc: undefined,
            name: { segment: "Def" },
          },
        },
      ],
    })
  })

  it("transforms the content into a custom ast (b.ts)", () => {
    const actual = fileToAst(b, checker, program)

    assert.deepEqual<RootNode>(actual, {
      kind: NodeKind.Root,
      fileName: b.fileName,
      jsDoc: undefined,
      imports: [
        {
          kind: NodeKind.DefaultImport,
          name: "D",
          fileName: join(root, "a.ts"),
        },
        {
          kind: NodeKind.NamedImport,
          name: "A",
          alias: "TypeA",
          fileName: join(root, "a.ts"),
        },
      ],
      children: [
        {
          kind: NodeKind.TypeDefinition,
          fileName: b.fileName,
          jsDoc: undefined,
          name: "B",
          typeParameters: undefined,
          definition: {
            kind: NodeKind.Reference,
            fileName: b.fileName,
            resolvedFileName: a.fileName,
            jsDoc: undefined,
            name: { segment: "TypeA", right: undefined },
            typeArguments: [
              {
                kind: NodeKind.Reference,
                fileName: b.fileName,
                resolvedFileName: undefined,
                jsDoc: undefined,
                name: { segment: "D", right: undefined },
                typeArguments: undefined,
              },
            ],
          },
        },
        {
          kind: NodeKind.TypeDefinition,
          fileName: b.fileName,
          jsDoc: undefined,
          name: "C",
          typeParameters: undefined,
          definition: {
            kind: NodeKind.Token,
            fileName: b.fileName,
            jsDoc: undefined,
            token: TokenKind.String,
          },
        },
      ],
    })
  })
})
