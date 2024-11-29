import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { Keyword, Token, tokenize, TokenKind } from "../../src/lang/lexer.js"

describe("tokenize", () => {
  it("transforms an empty string into an empty array", () => {
    assert.deepEqual<Token[]>(tokenize(``), [])
  })

  it("transforms a typealias string to a series of tokens", () => {
    assert.deepEqual<Token[]>(tokenize(`typealias Test = Int`), [
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
    ])
  })

  it("transforms a record string to a series of tokens", () => {
    assert.deepEqual<Token[]>(
      tokenize(`record Attribute {
  id: Int
  name: String
}`),
      [
        {
          kind: TokenKind.Keyword,
          keyword: Keyword.record,
          leadingSpaces: 0,
          start: 0,
          end: 6,
        },
        // { kind: TokenKind.Space, length: 1, leadingSpaces: 0, start: 6, end: 7 },
        {
          kind: TokenKind.Identifier,
          identifier: "Attribute",
          leadingSpaces: 1,
          start: 7,
          end: 16,
        },
        // { kind: TokenKind.Space, length: 1, leadingSpaces: 0, start: 16, end: 17 },
        { kind: TokenKind.LeftBrace, leadingSpaces: 1, start: 17, end: 18 },
        { kind: TokenKind.NewLine, leadingSpaces: 0, start: 18, end: 19 },
        // { kind: TokenKind.Space, length: 2, leadingSpaces: 1, start: 19, end: 21 },
        {
          kind: TokenKind.Identifier,
          identifier: "id",
          leadingSpaces: 2,
          start: 21,
          end: 23,
        },
        { kind: TokenKind.Colon, leadingSpaces: 0, start: 23, end: 24 },
        // { kind: TokenKind.Space, length: 1, leadingSpaces: 0, start: 24, end: 25 },
        {
          kind: TokenKind.Identifier,
          identifier: "Int",
          leadingSpaces: 1,
          start: 25,
          end: 28,
        },
        { kind: TokenKind.NewLine, leadingSpaces: 0, start: 28, end: 29 },
        // { kind: TokenKind.Space, length: 2, leadingSpaces: 1, start: 29, end: 31 },
        {
          kind: TokenKind.Identifier,
          identifier: "name",
          leadingSpaces: 2,
          start: 31,
          end: 35,
        },
        { kind: TokenKind.Colon, leadingSpaces: 0, start: 35, end: 36 },
        // { kind: TokenKind.Space, length: 1, leadingSpaces: 0, start: 36, end: 37 },
        {
          kind: TokenKind.Identifier,
          identifier: "String",
          leadingSpaces: 1,
          start: 37,
          end: 43,
        },
        { kind: TokenKind.NewLine, leadingSpaces: 0, start: 43, end: 44 },
        { kind: TokenKind.RightBrace, leadingSpaces: 0, start: 44, end: 45 },
      ]
    )
  })

  it("transforms a enum string to a series of tokens", () => {
    assert.deepEqual<Token[]>(
      tokenize(`enum Page = InsideCoverStart | InsideCoverEnd | Numbered<Int>`),
      [
        {
          kind: TokenKind.Keyword,
          keyword: Keyword.enum,
          leadingSpaces: 0,
          start: 0,
          end: 4,
        },
        // { kind: TokenKind.Space, length: 1, leadingSpaces: 0, start: 4, end: 5 },
        {
          kind: TokenKind.Identifier,
          identifier: "Page",
          leadingSpaces: 1,
          start: 5,
          end: 9,
        },
        // { kind: TokenKind.Space, length: 1, leadingSpaces: 0, start: 9, end: 10 },
        { kind: TokenKind.Equal, leadingSpaces: 1, start: 10, end: 11 },
        // { kind: TokenKind.Space, length: 1, leadingSpaces: 0, start: 11, end: 12 },
        {
          kind: TokenKind.Identifier,
          identifier: "InsideCoverStart",
          leadingSpaces: 1,
          start: 12,
          end: 28,
        },
        // { kind: TokenKind.Space, length: 1, leadingSpaces: 0, start: 28, end: 29 },
        { kind: TokenKind.Vert, leadingSpaces: 1, start: 29, end: 30 },
        // { kind: TokenKind.Space, length: 1, leadingSpaces: 0, start: 30, end: 31 },
        {
          kind: TokenKind.Identifier,
          identifier: "InsideCoverEnd",
          leadingSpaces: 1,
          start: 31,
          end: 45,
        },
        // { kind: TokenKind.Space, length: 1, leadingSpaces: 0, start: 45, end: 46 },
        { kind: TokenKind.Vert, leadingSpaces: 1, start: 46, end: 47 },
        // { kind: TokenKind.Space, length: 1, leadingSpaces: 0, start: 47, end: 48 },
        {
          kind: TokenKind.Identifier,
          identifier: "Numbered",
          leadingSpaces: 1,
          start: 48,
          end: 56,
        },
        { kind: TokenKind.LeftAngle, leadingSpaces: 0, start: 56, end: 57 },
        {
          kind: TokenKind.Identifier,
          identifier: "Int",
          leadingSpaces: 0,
          start: 57,
          end: 60,
        },
        { kind: TokenKind.RightAngle, leadingSpaces: 0, start: 60, end: 61 },
      ]
    )
  })
})
