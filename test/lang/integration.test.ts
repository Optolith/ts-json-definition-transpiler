import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { tokenize, TokenKind } from "../../src/lang/lexer.js"
import { DeclNode, NodeKind, parse } from "../../src/lang/parser.js"

describe("tokenize and parse", () => {
  it("transforms an empty string into an empty node", () => {
    assert.deepEqual(parse(tokenize("")), [])
  })

  it("transforms a typealias syntax into a typealias node", () => {
    assert.deepEqual<DeclNode[]>(parse(tokenize("typealias Test = [Int]")), [
      {
        kind: NodeKind.TypeAlias,
        name: {
          kind: TokenKind.Identifier,
          identifier: "Test",
          leadingSpaces: 1,
          start: 10,
          end: 14,
        },
        type: {
          kind: NodeKind.ArrayType,
          element: {
            kind: NodeKind.IdentifierType,
            identifier: {
              kind: TokenKind.Identifier,
              identifier: "Int",
              leadingSpaces: 0,
              start: 18,
              end: 21,
            },
          },
        },
      },
    ])
  })

  it("transforms a record syntax into a record node", () => {
    assert.deepEqual<DeclNode[]>(
      parse(
        tokenize(`record Test {
  id: Int
  name: String
}`)
      ),
      [
        {
          kind: NodeKind.Record,
          name: {
            kind: TokenKind.Identifier,
            identifier: "Test",
            leadingSpaces: 1,
            start: 7,
            end: 11,
          },
          members: [
            {
              kind: NodeKind.RecordMember,
              name: {
                kind: TokenKind.Identifier,
                identifier: "id",
                leadingSpaces: 2,
                start: 16,
                end: 18,
              },
              type: {
                kind: NodeKind.IdentifierType,
                identifier: {
                  kind: TokenKind.Identifier,
                  identifier: "Int",
                  leadingSpaces: 1,
                  start: 20,
                  end: 23,
                },
              },
            },
            {
              kind: NodeKind.RecordMember,
              name: {
                kind: TokenKind.Identifier,
                identifier: "name",
                leadingSpaces: 2,
                start: 26,
                end: 30,
              },
              type: {
                kind: NodeKind.IdentifierType,
                identifier: {
                  kind: TokenKind.Identifier,
                  identifier: "String",
                  leadingSpaces: 1,
                  start: 32,
                  end: 38,
                },
              },
            },
          ],
        },
      ]
    )
  })

  it("transforms a enum syntax into a enum node", () => {
    assert.deepEqual<DeclNode[]>(
      parse(
        tokenize(`enum Test =
  | Int
  | String`)
      ),
      [
        {
          kind: NodeKind.Enum,
          name: {
            kind: TokenKind.Identifier,
            identifier: "Test",
            leadingSpaces: 1,
            start: 5,
            end: 9,
          },
          members: [
            {
              kind: NodeKind.EnumCase,
              name: {
                kind: TokenKind.Identifier,
                identifier: "Int",
                leadingSpaces: 1,
                start: 16,
                end: 19,
              },
            },
            {
              kind: NodeKind.EnumCase,
              name: {
                kind: TokenKind.Identifier,
                identifier: "String",
                leadingSpaces: 1,
                start: 24,
                end: 30,
              },
            },
          ],
        },
      ]
    )
  })
})
