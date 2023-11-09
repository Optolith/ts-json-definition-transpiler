import * as assert from "node:assert/strict"
import { normalize, sep } from "node:path"
import { dirname, join } from "node:path/posix"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { NodeKind, RootNode, TokenKind } from "../../src/ast.js"
import { fileToAst } from "../../src/parser/ast.js"
import { resolveTypeArgumentsForFile } from "../../src/parser/resolvetypeargs.js"

const prepareTypeScriptInstance = (
  suite: string,
  filePaths: string[][]
): { checker: ts.TypeChecker; program: ts.Program; root: string } => {
  const root = join(dirname(fileURLToPath(import.meta.url)), suite)
  const program = ts.createProgram(
    filePaths.map((file) => join(root, ...file)),
    { strict: true }
  )
  const checker = program.getTypeChecker()
  return { program, checker, root }
}

describe("resolveTypeArgumentsForFile", () => {
  const { checker, program, root } = prepareTypeScriptInstance("files", [
    ["a.ts"],
    ["b.ts"],
  ])
  const a = program
    .getSourceFiles()
    .find((file) => normalize(file.fileName).endsWith(sep + "a.ts"))!
  const b = program
    .getSourceFiles()
    .find((file) => normalize(file.fileName).endsWith(sep + "b.ts"))!
  const asta = fileToAst(a, checker, program)
  const astb = fileToAst(b, checker, program)

  it("keeps generic types with default arguments", () => {
    const actual = resolveTypeArgumentsForFile(
      { [a.fileName]: asta, [b.fileName]: astb },
      asta
    )

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
                  kind: NodeKind.Token,
                  fileName: a.fileName,
                  jsDoc: undefined,
                  token: TokenKind.Number,
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
      ],
    })
  })

  it("resolves generic types only as deep as required", () => {
    const actual = resolveTypeArgumentsForFile(
      { [a.fileName]: asta, [b.fileName]: astb },
      astb
    )

    assert.deepEqual<RootNode>(actual, {
      kind: NodeKind.Root,
      fileName: b.fileName,
      jsDoc: undefined,
      imports: [
        {
          kind: NodeKind.DefaultImport,
          fileName: a.fileName,
          name: "D",
        },
        {
          kind: NodeKind.NamedImport,
          fileName: a.fileName,
          name: "A",
          alias: "TypeA",
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
                  fileName: b.fileName,
                  jsDoc: undefined,
                  name: { segment: "D", right: undefined },
                  typeArguments: undefined,
                  resolvedFileName: a.fileName,
                },
              },
            },
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

  it("maintains cross-file references", () => {
    const { checker, program, root } = prepareTypeScriptInstance(
      "resolvetypeargsfiles",
      [["a.ts"], ["b.ts"], ["c.ts"]]
    )
    const a = program
      .getSourceFiles()
      .find((file) => normalize(file.fileName).endsWith(sep + "a.ts"))!
    const b = program
      .getSourceFiles()
      .find((file) => normalize(file.fileName).endsWith(sep + "b.ts"))!
    const c = program
      .getSourceFiles()
      .find((file) => normalize(file.fileName).endsWith(sep + "c.ts"))!
    const asta = fileToAst(a, checker, program)
    const astb = fileToAst(b, checker, program)
    const astc = fileToAst(c, checker, program)
    const files = {
      [a.fileName]: asta,
      [b.fileName]: astb,
      [c.fileName]: astc,
    }
    const actual = resolveTypeArgumentsForFile(files, astc)

    assert.deepEqual<RootNode>(actual, {
      kind: NodeKind.Root,
      fileName: c.fileName,
      jsDoc: undefined,
      imports: [
        {
          kind: NodeKind.NamedImport,
          fileName: b.fileName,
          name: "B",
        },
      ],
      children: [
        {
          kind: NodeKind.TypeDefinition,
          fileName: c.fileName,
          jsDoc: undefined,
          name: "C",
          typeParameters: undefined,
          definition: {
            kind: NodeKind.Record,
            fileName: b.fileName,
            jsDoc: undefined,
            children: {
              object: {
                isReadOnly: false,
                isRequired: true,
                jsDoc: undefined,
                value: {
                  kind: NodeKind.Reference,
                  fileName: b.fileName,
                  resolvedFileName: a.fileName,
                  jsDoc: undefined,
                  name: { segment: "A", right: undefined },
                  typeArguments: undefined,
                },
              },
              value: {
                isReadOnly: false,
                isRequired: true,
                jsDoc: undefined,
                value: {
                  kind: NodeKind.Token,
                  fileName: c.fileName,
                  jsDoc: undefined,
                  token: TokenKind.Number,
                },
              },
            },
          },
        },
      ],
    })
  })
})
