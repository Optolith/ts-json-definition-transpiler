import {
  AtSignToken,
  ColonToken,
  CommaToken,
  EqualToken,
  FloatLiteralToken,
  IdentifierToken,
  IntegerLiteralToken,
  KeywordToken,
  LeftAngleToken,
  LeftBraceToken,
  LeftBracketToken,
  LeftParenToken,
  NewLineToken,
  RightAngleToken,
  RightBraceToken,
  RightBracketToken,
  RightParenToken,
  StringLiteralToken,
  Token,
  TokenKind,
  VertToken,
} from "./lexer.js"

export const isAtSignToken = (token: Token | undefined): token is AtSignToken =>
  token?.kind === TokenKind.AtSign

export const isColonToken = (token: Token | undefined): token is ColonToken =>
  token?.kind === TokenKind.Colon

export const isCommaToken = (token: Token | undefined): token is CommaToken =>
  token?.kind === TokenKind.Comma

export const isEqualToken = (token: Token | undefined): token is EqualToken =>
  token?.kind === TokenKind.Equal

export const isFloatLiteralToken = (
  token: Token | undefined
): token is FloatLiteralToken => token?.kind === TokenKind.FloatLiteral

export const isIdentifierToken = (
  token: Token | undefined
): token is IdentifierToken => token?.kind === TokenKind.Identifier

export const isIntegerLiteralToken = (
  token: Token | undefined
): token is IntegerLiteralToken => token?.kind === TokenKind.IntegerLiteral

export const isKeywordToken = (
  token: Token | undefined
): token is KeywordToken => token?.kind === TokenKind.Keyword

export const isLeftAngleToken = (
  token: Token | undefined
): token is LeftAngleToken => token?.kind === TokenKind.LeftAngle

export const isLeftBraceToken = (
  token: Token | undefined
): token is LeftBraceToken => token?.kind === TokenKind.LeftBrace

export const isLeftBracketToken = (
  token: Token | undefined
): token is LeftBracketToken => token?.kind === TokenKind.LeftBracket

export const isLeftParenToken = (
  token: Token | undefined
): token is LeftParenToken => token?.kind === TokenKind.LeftParen

export const isNewLineToken = (
  token: Token | undefined
): token is NewLineToken => token?.kind === TokenKind.NewLine

export const isRightAngleToken = (
  token: Token | undefined
): token is RightAngleToken => token?.kind === TokenKind.RightAngle

export const isRightBraceToken = (
  token: Token | undefined
): token is RightBraceToken => token?.kind === TokenKind.RightBrace

export const isRightBracketToken = (
  token: Token | undefined
): token is RightBracketToken => token?.kind === TokenKind.RightBracket

export const isRightParenToken = (
  token: Token | undefined
): token is RightParenToken => token?.kind === TokenKind.RightParen

// export const isSpaceToken = (token: Token | undefined): token is SpaceToken =>
//   token?.kind === TokenKind.Space

export const isStringLiteralToken = (
  token: Token | undefined
): token is StringLiteralToken => token?.kind === TokenKind.StringLiteral

export const isVertToken = (token: Token | undefined): token is VertToken =>
  token?.kind === TokenKind.Vert
