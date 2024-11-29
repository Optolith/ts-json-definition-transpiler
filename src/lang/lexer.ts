import { EOL } from "os"

export enum TokenKind {
  AtSign = "AtSign",
  Colon = "Colon",
  Comma = "Comma",
  Equal = "Equal",
  FloatLiteral = "FloatLiteral",
  Identifier = "Identifier",
  IntegerLiteral = "IntegerLiteral",
  Keyword = "Keyword",
  LeftAngle = "LeftAngle",
  LeftBrace = "LeftBrace",
  LeftBracket = "LeftBracket",
  LeftParen = "LeftParen",
  NewLine = "NewLine",
  RightAngle = "RightAngle",
  RightBrace = "RightBrace",
  RightBracket = "RightBracket",
  RightParen = "RightParen",
  // Space = "Space",
  StringLiteral = "StringLiteral",
  Vert = "Vert",
}

export interface TokenBase {
  kind: TokenKind
  leadingSpaces: number
  start: number
  end: number
}

export interface AtSignToken extends TokenBase {
  kind: TokenKind.AtSign
}

export interface ColonToken extends TokenBase {
  kind: TokenKind.Colon
}

export interface CommaToken extends TokenBase {
  kind: TokenKind.Comma
}

export interface EqualToken extends TokenBase {
  kind: TokenKind.Equal
}

export interface FloatLiteralToken extends TokenBase {
  kind: TokenKind.FloatLiteral
  value: number
}

export interface IdentifierToken extends TokenBase {
  kind: TokenKind.Identifier
  identifier: string
}

export interface IntegerLiteralToken extends TokenBase {
  kind: TokenKind.IntegerLiteral
  value: number
}

export enum Keyword {
  enum = "enum",
  record = "record",
  typealias = "typealias",
}

export interface KeywordToken<K extends Keyword = Keyword> extends TokenBase {
  kind: TokenKind.Keyword
  keyword: K
}

export interface LeftAngleToken extends TokenBase {
  kind: TokenKind.LeftAngle
}

export interface LeftBraceToken extends TokenBase {
  kind: TokenKind.LeftBrace
}

export interface LeftBracketToken extends TokenBase {
  kind: TokenKind.LeftBracket
}

export interface LeftParenToken extends TokenBase {
  kind: TokenKind.LeftParen
}

export interface NewLineToken extends TokenBase {
  kind: TokenKind.NewLine
}

export interface RightAngleToken extends TokenBase {
  kind: TokenKind.RightAngle
}

export interface RightBraceToken extends TokenBase {
  kind: TokenKind.RightBrace
}

export interface RightBraceToken extends TokenBase {
  kind: TokenKind.RightBrace
}

export interface RightBracketToken extends TokenBase {
  kind: TokenKind.RightBracket
}

export interface RightParenToken extends TokenBase {
  kind: TokenKind.RightParen
}

// export interface SpaceToken extends TokenBase {
//   kind: TokenKind.Space
//   length: number
// }

export interface StringLiteralToken extends TokenBase {
  kind: TokenKind.StringLiteral
  value: string
}

export interface VertToken extends TokenBase {
  kind: TokenKind.Vert
}

export type Token =
  | AtSignToken
  | ColonToken
  | CommaToken
  | EqualToken
  | FloatLiteralToken
  | IdentifierToken
  | IntegerLiteralToken
  | KeywordToken
  | LeftAngleToken
  | LeftBraceToken
  | LeftBracketToken
  | LeftParenToken
  | StringLiteralToken
  | NewLineToken
  | RightAngleToken
  | RightBraceToken
  | RightBracketToken
  | RightParenToken
  // | SpaceToken
  | VertToken

const applyPositionAndTokenizeRest = <T extends Token>(
  token: Omit<T, "start" | "end" | "leadingSpaces">,
  leadingSpaces: number,
  sourceLength: number,
  source: string,
  start: number
): Token[] => [
  {
    ...token,
    leadingSpaces,
    start: start + leadingSpaces,
    end: start + leadingSpaces + sourceLength,
  } as Token,
  ...tokenize(source.slice(sourceLength), start + leadingSpaces + sourceLength),
]

export const tokenize = (source: string, start: number = 0): Token[] => {
  if (source === "") {
    return []
  }

  const leadingSpaces = source.match(/^ +/)?.[0].length ?? 0
  const trimmedSource = source.slice(leadingSpaces)

  switch (trimmedSource[0]) {
    case "@":
      return applyPositionAndTokenizeRest(
        { kind: TokenKind.AtSign },
        leadingSpaces,
        1,
        trimmedSource,
        start
      )
    case "<":
      return applyPositionAndTokenizeRest(
        { kind: TokenKind.LeftAngle },
        leadingSpaces,
        1,
        trimmedSource,
        start
      )
    case "{":
      return applyPositionAndTokenizeRest(
        { kind: TokenKind.LeftBrace },
        leadingSpaces,
        1,
        trimmedSource,
        start
      )
    case "[":
      return applyPositionAndTokenizeRest(
        { kind: TokenKind.LeftBracket },
        leadingSpaces,
        1,
        trimmedSource,
        start
      )
    case "(":
      return applyPositionAndTokenizeRest(
        { kind: TokenKind.LeftParen },
        leadingSpaces,
        1,
        trimmedSource,
        start
      )
    case ">":
      return applyPositionAndTokenizeRest(
        { kind: TokenKind.RightAngle },
        leadingSpaces,
        1,
        trimmedSource,
        start
      )
    case "}":
      return applyPositionAndTokenizeRest(
        { kind: TokenKind.RightBrace },
        leadingSpaces,
        1,
        trimmedSource,
        start
      )
    case "]":
      return applyPositionAndTokenizeRest(
        { kind: TokenKind.RightBracket },
        leadingSpaces,
        1,
        trimmedSource,
        start
      )
    case ")":
      return applyPositionAndTokenizeRest(
        { kind: TokenKind.RightParen },
        leadingSpaces,
        1,
        trimmedSource,
        start
      )
    case ":":
      return applyPositionAndTokenizeRest(
        { kind: TokenKind.Colon },
        leadingSpaces,
        1,
        trimmedSource,
        start
      )
    case ",":
      return applyPositionAndTokenizeRest(
        { kind: TokenKind.Comma },
        leadingSpaces,
        1,
        trimmedSource,
        start
      )
    case "=":
      return applyPositionAndTokenizeRest(
        { kind: TokenKind.Equal },
        leadingSpaces,
        1,
        trimmedSource,
        start
      )
    case "|":
      return applyPositionAndTokenizeRest(
        { kind: TokenKind.Vert },
        leadingSpaces,
        1,
        trimmedSource,
        start
      )
    case EOL:
      return applyPositionAndTokenizeRest(
        { kind: TokenKind.NewLine },
        leadingSpaces,
        EOL.length,
        trimmedSource,
        start
      )
    // case " ": {
    //   const spaces = source.match(/^ +/)?.[0].length ?? 0
    //   return applyPositionAndTokenizeRest<SpaceToken>(
    //     {
    //       kind: TokenKind.Space,
    //       length: spaces,
    //     },
    //     spaces,
    //     source,
    //     start
    //   )
    // }
    default: {
      const number = trimmedSource.match(
        /^(?<integer>\d+(?:_\d+)*)(?<float>\.\d+)?/
      )
      if (number !== null && number.groups?.float !== undefined) {
        return applyPositionAndTokenizeRest<FloatLiteralToken>(
          {
            kind: TokenKind.FloatLiteral,
            value: Number.parseFloat(number[0]),
          },
          leadingSpaces,
          number[0].length,
          trimmedSource,
          start
        )
      }

      if (number !== null) {
        return applyPositionAndTokenizeRest<IntegerLiteralToken>(
          {
            kind: TokenKind.IntegerLiteral,
            value: Number.parseInt(number[0], 10),
          },
          leadingSpaces,
          number[0].length,
          trimmedSource,
          start
        )
      }

      const string = trimmedSource.match(/^"([^"\\]|\\.)*"/)
      if (string !== null) {
        return applyPositionAndTokenizeRest<StringLiteralToken>(
          {
            kind: TokenKind.StringLiteral,
            value: string[1]!,
          },
          leadingSpaces,
          string[0].length,
          trimmedSource,
          start
        )
      }

      const identifier = trimmedSource.match(/^[a-zA-Z_](?:[a-zA-Z0-9_]*)/)
      if (identifier !== null) {
        if (Keyword[identifier[0] as keyof typeof Keyword] !== undefined) {
          return applyPositionAndTokenizeRest<KeywordToken>(
            {
              kind: TokenKind.Keyword,
              keyword: Keyword[identifier[0] as keyof typeof Keyword],
            },
            leadingSpaces,
            identifier[0].length,
            trimmedSource,
            start
          )
        }

        return applyPositionAndTokenizeRest<IdentifierToken>(
          {
            kind: TokenKind.Identifier,
            identifier: identifier[0],
          },
          leadingSpaces,
          identifier[0].length,
          trimmedSource,
          start
        )
      }

      throw new Error(`Unexpected character: ${trimmedSource[0]}`)
    }
  }
}
