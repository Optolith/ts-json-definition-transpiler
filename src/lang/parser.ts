import { IdentifierToken, Keyword, Token, TokenKind } from "./lexer.js"
import {
  assertColonToken,
  assertEqualToken,
  assertIdentifierToken,
  assertKeyword,
  assertLeftBraceToken,
  assertLeftBracketToken,
  assertRightBraceToken,
  assertRightBracketToken,
  throwEmptyInput,
} from "./tokenAssertions.js"
import {
  isIdentifierToken,
  isKeywordToken,
  isLeftBraceToken,
  isNewLineToken,
  isRightBraceToken,
  isVertToken,
} from "./tokenGuards.js"

export type Node = DeclNode

export enum NodeKind {
  // Declarations
  Enum,
  EnumCase,
  Record,
  RecordMember,
  TypeAlias,

  // Types
  ArrayType,
  IdentifierType,
}

//#region Declarations

export type DeclNode = EnumNode | RecordNode | TypeAliasNode

export type EnumNode = {
  kind: NodeKind.Enum
  name: Token
  members: EnumCaseNode[]
}

export type EnumCaseNode = {
  kind: NodeKind.EnumCase
  name: Token
}

export type RecordNode = {
  kind: NodeKind.Record
  name: Token
  members: RecordMemberNode[]
}

export type RecordMemberNode = {
  kind: NodeKind.RecordMember
  name: Token
  type: TypeNode
}

export type TypeAliasNode = {
  kind: NodeKind.TypeAlias
  name: Token
  type: TypeNode
}

//#endregion

//#region Types

export type TypeNode = ArrayTypeNode | IdentifierTypeNode

export type ArrayTypeNode = {
  kind: NodeKind.ArrayType
  element: TypeNode
}

export type IdentifierTypeNode = {
  kind: NodeKind.IdentifierType
  identifier: Token
}

//#endregion

const oneOf = <T>(
  source: Token[],
  ...values: [(source: Token[]) => boolean, (source: Token[]) => [T, Token[]]][]
): [T, Token[]] => {
  for (const value of values) {
    if (value[0](source)) {
      return value[1](source)
    }
  }

  if (source[0] === undefined) {
    return throwEmptyInput()
  }

  throw new Error(`Unexpected token ${TokenKind[source[0].kind]}`)
}

const parseArrayType = (source: Token[]): [ArrayTypeNode, Token[]] => {
  assertLeftBracketToken(source[0])
  const [element, rest] = parseTypeNode(source.slice(1))
  assertRightBracketToken(rest[0])
  return [{ kind: NodeKind.ArrayType, element }, rest.slice(1)]
}

const parseIdentifierTypeNode = (
  source: Token[]
): [IdentifierTypeNode, Token[]] => {
  assertIdentifierToken(source[0])
  return [
    { kind: NodeKind.IdentifierType, identifier: source[0] },
    source.slice(1),
  ]
}

const parseTypeNode = (source: Token[]): [TypeNode, Token[]] =>
  oneOf<TypeNode>(
    source,
    [(source) => isLeftBraceToken(source[0]), parseArrayType],
    [(source) => isIdentifierToken(source[0]), parseIdentifierTypeNode]
  )

const parseEnumCaseNode = (source: Token[]): [EnumCaseNode, Token[]] => {
  assertIdentifierToken(source[0])
  return [{ kind: NodeKind.EnumCase, name: source[0] }, source.slice(1)]
}

const parseEnumCaseNodes = (
  source: Token[],
  isFirst: boolean = true
): [EnumCaseNode[], Token[]] => {
  if (source.length === 0) {
    return [[], []]
  }

  if (isNewLineToken(source[0])) {
    return parseEnumCaseNodes(source.slice(1), isFirst)
  }

  if (!isFirst && !isVertToken(source[0])) {
    throw new Error("Enum cases must be separated by a vertical bar")
  }

  try {
    const [member, rest] = parseEnumCaseNode(
      isVertToken(source[0]) ? source.slice(1) : source
    )
    const [restMembers, finalRest] = parseEnumCaseNodes(rest.slice(1), false)
    return [[member, ...restMembers], finalRest]
  } catch {
    return [[], source]
  }
}

const parseEnumNode = (source: Token[]): [EnumNode, Token[]] => {
  assertKeyword(source[0], Keyword.enum)
  assertIdentifierToken(source[1])
  assertEqualToken(source[2])

  const content =
    isNewLineToken(source[3]) && isVertToken(source[4])
      ? source.slice(5)
      : isVertToken(source[3])
      ? source.slice(4)
      : source.slice(3)

  const [members, rest] = parseEnumCaseNodes(content)

  if (members.length === 0) {
    throw new Error("Enum type must have at least one case")
  }

  if (
    new Set(
      members.map((member) => (member.name as IdentifierToken).identifier)
    ).size !== members.length
  ) {
    throw new Error("Enum cases must have unique names")
  }

  return [{ kind: NodeKind.Enum, name: source[1], members }, rest]
}

const parseRecordMemberNode = (
  source: Token[]
): [RecordMemberNode, Token[]] => {
  assertIdentifierToken(source[0])
  assertColonToken(source[1])
  const [type, rest] = parseTypeNode(source.slice(2))
  return [{ kind: NodeKind.RecordMember, name: source[0], type }, rest]
}

const parseRecordMemberNodes = (
  source: Token[]
): [RecordMemberNode[], Token[]] => {
  if (source.length === 0) {
    return [[], []]
  }

  if (isNewLineToken(source[0])) {
    return parseRecordMemberNodes(source.slice(1))
  }

  try {
    const [member, rest] = parseRecordMemberNode(source)
    const [restMembers, finalRest] = parseRecordMemberNodes(rest)
    return [[member, ...restMembers], finalRest]
  } catch {
    return [[], source]
  }
}

const parseRecordNode = (source: Token[]): [RecordNode, Token[]] => {
  assertKeyword(source[0], Keyword.record)
  assertIdentifierToken(source[1])
  assertLeftBraceToken(source[2])
  if (isRightBraceToken(source[3])) {
    throw new Error("Record type must have at least one member")
  }
  const [members, rest] = parseRecordMemberNodes(source.slice(3))
  assertRightBraceToken(rest[0])

  return [{ kind: NodeKind.Record, name: source[1], members }, rest.slice(1)]
}

const parseTypeAliasNode = (source: Token[]): [TypeAliasNode, Token[]] => {
  assertKeyword(source[0], Keyword.typealias)
  assertIdentifierToken(source[1])
  assertEqualToken(source[2])
  const [type, rest] = parseTypeNode(source.slice(3))
  return [{ kind: NodeKind.TypeAlias, name: source[1], type }, rest]
}

const parseDeclNode = (source: Token[]): [DeclNode, Token[]] =>
  oneOf<DeclNode>(
    source,
    [
      (source) =>
        isKeywordToken(source[0]) && source[0].keyword === Keyword.enum,
      parseEnumNode,
    ],
    [
      (source) =>
        isKeywordToken(source[0]) && source[0].keyword === Keyword.record,
      parseRecordNode,
    ],
    [
      (source) =>
        isKeywordToken(source[0]) && source[0].keyword === Keyword.typealias,
      parseTypeAliasNode,
    ]
  )

export const parse = (source: Token[]): DeclNode[] => {
  if (source.length === 0) {
    return []
  }

  const [node, rest] = parseDeclNode(source)

  if (isNewLineToken(rest[0])) {
    return [node, ...parse(rest.slice(1))]
  }

  return [node]
}
