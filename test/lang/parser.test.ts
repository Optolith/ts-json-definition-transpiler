import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { Keyword, TokenKind } from "../../src/lang/lexer.js"
import { DeclNode, NodeKind, parse } from "../../src/lang/parser.js"

describe("parse", () => {
  it("transforms an empty token list into an empty node", () => {
    assert.deepEqual<DeclNode[]>(parse([]), [])
  })

  it("transforms an empty string into an empty array", () => {
    assert.deepEqual<DeclNode[]>(
      parse([
        {
          kind: TokenKind.Keyword,
          keyword: Keyword.typealias,
          leadingSpaces: 0,
          start: 0,
          end: 9,
        },
        // { kind: TokenKind.Space, length: 1, start: 9, end: 10 },
        {
          kind: TokenKind.Identifier,
          identifier: "Test",
          leadingSpaces: 1,
          start: 10,
          end: 14,
        },
        // { kind: TokenKind.Space, length: 1, start: 14, end: 15 },
        { kind: TokenKind.Equal, leadingSpaces: 1, start: 15, end: 16 },
        // { kind: TokenKind.Space, length: 1, start: 16, end: 17 },
        {
          kind: TokenKind.Identifier,
          identifier: "Int",
          leadingSpaces: 1,
          start: 17,
          end: 20,
        },
      ]),
      [
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
            kind: NodeKind.IdentifierType,
            identifier: {
              kind: TokenKind.Identifier,
              identifier: "Int",
              leadingSpaces: 1,
              start: 17,
              end: 20,
            },
          },
        },
      ]
    )
  })
})
