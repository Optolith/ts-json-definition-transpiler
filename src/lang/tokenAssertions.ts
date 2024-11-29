import {
  AtSignToken,
  ColonToken,
  CommaToken,
  EqualToken,
  FloatLiteralToken,
  IdentifierToken,
  IntegerLiteralToken,
  Keyword,
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
import {
  isAtSignToken,
  isColonToken,
  isCommaToken,
  isEqualToken,
  isFloatLiteralToken,
  isIdentifierToken,
  isIntegerLiteralToken,
  isKeywordToken,
  isLeftAngleToken,
  isLeftBraceToken,
  isLeftBracketToken,
  isLeftParenToken,
  isNewLineToken,
  isRightAngleToken,
  isRightBraceToken,
  isRightBracketToken,
  isRightParenToken,
  isStringLiteralToken,
  isVertToken,
} from "./tokenGuards.js"

export const throwEmptyInput = (expected?: string) => {
  throw new Error(
    "Unexpected end of input" + (expected ? `, expected "${expected}"` : "")
  )
}

export const throwUnexpectedToken = (
  expected: string,
  actual: Token | undefined
) => {
  if (actual === undefined) {
    return throwEmptyInput(expected)
  }

  throw new Error(`Expected "${expected}" but got ${TokenKind[actual.kind]}`)
}

export function assertAtSignToken(
  token: Token | undefined
): asserts token is AtSignToken {
  if (!isAtSignToken(token)) {
    return throwUnexpectedToken("@", token)
  }
}

export function assertColonToken(
  token: Token | undefined
): asserts token is ColonToken {
  if (!isColonToken(token)) {
    return throwUnexpectedToken(":", token)
  }
}

export function assertCommaToken(
  token: Token | undefined
): asserts token is CommaToken {
  if (!isCommaToken(token)) {
    return throwUnexpectedToken(",", token)
  }
}

export function assertEqualToken(
  token: Token | undefined
): asserts token is EqualToken {
  if (!isEqualToken(token)) {
    return throwUnexpectedToken("=", token)
  }
}

export function assertFloatLiteralToken(
  token: Token | undefined
): asserts token is FloatLiteralToken {
  if (!isFloatLiteralToken(token)) {
    return throwUnexpectedToken("<float>", token)
  }
}

export function assertIdentifierToken(
  token: Token | undefined
): asserts token is IdentifierToken {
  if (!isIdentifierToken(token)) {
    return throwUnexpectedToken("<identifier>", token)
  }
}

export function assertIntegerLiteralToken(
  token: Token | undefined
): asserts token is IntegerLiteralToken {
  if (!isIntegerLiteralToken(token)) {
    return throwUnexpectedToken("<integer>", token)
  }
}

export function assertKeywordToken(
  token: Token | undefined
): asserts token is KeywordToken {
  if (!isKeywordToken(token)) {
    return throwUnexpectedToken("<keyword>", token)
  }
}

export function assertKeyword<K extends Keyword>(
  token: Token | undefined,
  keyword: K
): asserts token is KeywordToken<K> {
  if (!isKeywordToken(token) || token.keyword !== keyword) {
    return throwUnexpectedToken(keyword, token)
  }
}

export function assertLeftAngleToken(
  token: Token | undefined
): asserts token is LeftAngleToken {
  if (!isLeftAngleToken(token)) {
    return throwUnexpectedToken("<", token)
  }
}

export function assertLeftBraceToken(
  token: Token | undefined
): asserts token is LeftBraceToken {
  if (!isLeftBraceToken(token)) {
    return throwUnexpectedToken("{", token)
  }
}

export function assertLeftBracketToken(
  token: Token | undefined
): asserts token is LeftBracketToken {
  if (!isLeftBracketToken(token)) {
    return throwUnexpectedToken("[", token)
  }
}

export function assertLeftParenToken(
  token: Token | undefined
): asserts token is LeftParenToken {
  if (!isLeftParenToken(token)) {
    return throwUnexpectedToken("(", token)
  }
}

export function assertNewLineToken(
  token: Token | undefined
): asserts token is NewLineToken {
  if (!isNewLineToken(token)) {
    return throwUnexpectedToken("<newline>", token)
  }
}

export function assertRightAngleToken(
  token: Token | undefined
): asserts token is RightAngleToken {
  if (!isRightAngleToken(token)) {
    return throwUnexpectedToken(">", token)
  }
}

export function assertRightBraceToken(
  token: Token | undefined
): asserts token is RightBraceToken {
  if (!isRightBraceToken(token)) {
    return throwUnexpectedToken("}", token)
  }
}

export function assertRightBracketToken(
  token: Token | undefined
): asserts token is RightBracketToken {
  if (!isRightBracketToken(token)) {
    return throwUnexpectedToken("]", token)
  }
}

export function assertRightParenToken(
  token: Token | undefined
): asserts token is RightParenToken {
  if (!isRightParenToken(token)) {
    return throwUnexpectedToken(")", token)
  }
}

// export function assertSpaceToken(
//   token: Token | undefined
// ): asserts token is SpaceToken {
//   if (!isSpaceToken(token)) {
//     return throwUnexpectedToken("<space>", token)
//   }
// }

export function assertStringLiteralToken(
  token: Token | undefined
): asserts token is StringLiteralToken {
  if (!isStringLiteralToken(token)) {
    return throwUnexpectedToken("<string>", token)
  }
}

export function assertVertToken(
  token: Token | undefined
): asserts token is VertToken {
  if (!isVertToken(token)) {
    return throwUnexpectedToken("|", token)
  }
}
