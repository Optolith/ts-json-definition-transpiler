import * as assert from "node:assert/strict"
import { it } from "node:test"
import { NodeKind, TokenKind } from "../../../src/renderers/swift/ast.js"
import { renderDeclNode } from "../../../src/renderers/swift/renderer.js"

it("should render a type alias declaration node as string", () => {
  assert.deepEqual<string>(
    renderDeclNode({
      kind: NodeKind.TypeAliasDecl,
      name: { kind: TokenKind.Identifier, identifier: "Foo" },
      initializer: {
        kind: NodeKind.TypeInitializerClause,
        value: {
          kind: NodeKind.OptionalType,
          wrappedType: {
            kind: NodeKind.ArrayType,
            element: {
              kind: NodeKind.IdentifierType,
              name: { kind: TokenKind.Identifier, identifier: "Int" },
            },
          },
        },
      },
    }),
    `typealias Foo = [Int]?`
  )
})
