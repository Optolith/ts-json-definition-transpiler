import * as assert from "node:assert/strict"
import { it } from "node:test"
import {
  arrayType,
  identifierType,
  optionalType,
  typeAliasDecl,
} from "../../../src/renderers/swift/ast/creators.js"
import { renderDeclNode } from "../../../src/renderers/swift/renderer.js"

it("should render a type alias declaration node as string", () => {
  assert.deepEqual<string>(
    renderDeclNode(
      typeAliasDecl("Foo", {}, optionalType(arrayType(identifierType("Int"))))
    ),
    `typealias Foo = [Int]?`
  )
})
