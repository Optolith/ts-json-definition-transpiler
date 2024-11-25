import { filterNonNullable } from "@optolith/helpers/array"
import { isNotNullish } from "@optolith/helpers/nullable"
import { assertExhaustive } from "@optolith/helpers/typeSafety"
import * as SourceAst from "../../ast.js"
import { ignoreNode } from "../../utils/ignoreNode.js"

const IGNORE_ENV = "swift"

//#region Tokens

export type Token = IdentifierToken | KeywordToken | BinaryOperatorToken

export enum TokenKind {
  Identifier,
  Keyword,
  BinaryOperator,
}

export type IdentifierToken = Readonly<{
  kind: TokenKind.Identifier
  identifier: string
}>

export type KeywordToken = Readonly<{
  kind: TokenKind.Keyword
  keyword: Keyword
}>

export enum Keyword {
  Any = "Any",
  Protocol = "Protocol",
  Self = "Self",
  Sendable = "Sendable",
  Type = "Type",
  accesses = "accesses",
  actor = "actor",
  addressWithNativeOwner = "addressWithNativeOwner",
  addressWithOwner = "addressWithOwner",
  any = "any",
  as = "as",
  assignment = "assignment",
  associatedtype = "associatedtype",
  associativity = "associativity",
  async = "async",
  attached = "attached",
  autoclosure = "autoclosure",
  availability = "availability",
  available = "available",
  await = "await",
  backDeployed = "backDeployed",
  before = "before",
  block = "block",
  borrowing = "borrowing",
  break = "break",
  cType = "cType",
  canImport = "canImport",
  case = "case",
  catch = "catch",
  class = "class",
  compiler = "compiler",
  consume = "consume",
  consuming = "consuming",
  continue = "continue",
  convenience = "convenience",
  convention = "convention",
  copy = "copy",
  default = "default",
  defer = "defer",
  deinit = "deinit",
  deprecated = "deprecated",
  derivative = "derivative",
  didSet = "didSet",
  differentiable = "differentiable",
  discard = "discard",
  distributed = "distributed",
  do = "do",
  dynamic = "dynamic",
  each = "each",
  else = "else",
  enum = "enum",
  escaping = "escaping",
  exclusivity = "exclusivity",
  exported = "exported",
  extension = "extension",
  fallthrough = "fallthrough",
  false = "false",
  file = "file",
  fileprivate = "fileprivate",
  final = "final",
  for = "for",
  forward = "forward",
  freestanding = "freestanding",
  func = "func",
  get = "get",
  guard = "guard",
  higherThan = "higherThan",
  if = "if",
  import = "import",
  in = "in",
  indirect = "indirect",
  infix = "infix",
  init = "init",
  initializes = "initializes",
  inline = "inline",
  inout = "inout",
  internal = "internal",
  introduced = "introduced",
  is = "is",
  isolated = "isolated",
  kind = "kind",
  lazy = "lazy",
  left = "left",
  let = "let",
  line = "line",
  linear = "linear",
  lowerThan = "lowerThan",
  macro = "macro",
  message = "message",
  metadata = "metadata",
  module = "module",
  mutableAddressWithNativeOwner = "mutableAddressWithNativeOwner",
  mutableAddressWithOwner = "mutableAddressWithOwner",
  mutating = "mutating",
  nil = "nil",
  noDerivative = "noDerivative",
  noasync = "noasync",
  noescape = "noescape",
  none = "none",
  nonisolated = "nonisolated",
  nonmutating = "nonmutating",
  objc = "objc",
  obsoleted = "obsoleted",
  of = "of",
  open = "open",
  operator = "operator",
  optional = "optional",
  override = "override",
  package = "package",
  postfix = "postfix",
  precedencegroup = "precedencegroup",
  preconcurrency = "preconcurrency",
  prefix = "prefix",
  private = "private",
  protocol = "protocol",
  public = "public",
  reasync = "reasync",
  renamed = "renamed",
  repeat = "repeat",
  required = "required",
  rethrows = "rethrows",
  retroactive = "retroactive",
  return = "return",
  reverse = "reverse",
  right = "right",
  safe = "safe",
  self = "self",
  sending = "sending",
  set = "set",
  some = "some",
  sourceFile = "sourceFile",
  spi = "spi",
  spiModule = "spiModule",
  static = "static",
  struct = "struct",
  subscript = "subscript",
  super = "super",
  swift = "swift",
  switch = "switch",
  target = "target",
  then = "then",
  throw = "throw",
  throws = "throws",
  transpose = "transpose",
  true = "true",
  try = "try",
  typealias = "typealias",
  unavailable = "unavailable",
  unchecked = "unchecked",
  unowned = "unowned",
  unsafe = "unsafe",
  unsafeAddress = "unsafeAddress",
  unsafeMutableAddress = "unsafeMutableAddress",
  var = "var",
  visibility = "visibility",
  weak = "weak",
  where = "where",
  while = "while",
  willSet = "willSet",
  witness_method = "witness_method",
  wrt = "wrt",
  yield = "yield",
}

export type BinaryOperatorToken = Readonly<{
  kind: TokenKind.BinaryOperator
  operator: string
}>

//#endregion

export enum NodeKind {
  // Declarations
  EnumCaseDecl,
  EnumDecl,
  InitializerDecl,
  StructDecl,
  TypeAliasDecl,
  VariableDecl,

  // Expressions
  AssignmentExpr,
  BinaryOperatorExpr,
  BooleanLiteralExpr,
  DeclReferenceExpr,
  FloatLiteralExpr,
  InfixOperatorExpr,
  IntegerLiteralExpr,
  MemberAccessExpr,
  NilLiteralExpr,
  StringLiteralExpr,

  // Patterns
  IdentifierPattern,

  // Statements
  ExpressionStmt,

  // Types
  ArrayType,
  CompositionType,
  DictionaryType,
  InheritanceType,
  OptionalType,
  TupleType,

  // Collections
  AvailabilityArgumentList,
  AvailabilityArgument,
  CodeBlockItemList,
  CodeBlockItem,
  CompositionTypeElementList,
  CompositionTypeElement,
  DeclModifierList,
  DeclModifier,
  EnumCaseElementList,
  EnumCaseElement,
  EnumCaseParameterList,
  EnumCaseParameter,
  FunctionParameterList,
  FunctionParameter,
  GenericArgumentList,
  GenericArgument,
  GenericParameterList,
  GenericParameter,
  InheritanceTypeList,
  IdentifierType,
  MemberBlockItemList,
  MemberBlockItem,
  PatternBindingList,
  PatternBinding,
  TupleTypeElementList,
  TupleTypeElement,

  // Attributes
  AttributeList,
  Attribute,

  // Miscellaneous Nodes
  AvailabilityLabeledArgument,
  AvailabilityTokenArgument,
  CodeBlock,
  EnumCaseParameterClause,
  FunctionEffectSpecifiers,
  FunctionParameterClause,
  FunctionSignature,
  GenericArgumentClause,
  GenericParameterClause,
  InheritanceClause,
  InitializerClause,
  MemberBlock,
  ReturnClause,
  ThrowsClause,
  TypeAnnotation,
  TypeInitializerClause,
}

//#region Declarations

export type DeclNode =
  | EnumCaseDeclNode
  | EnumDeclNode
  | InitializerDeclNode
  | StructDeclNode
  | TypeAliasDeclNode
  | VariableDeclNode

export type EnumCaseDeclNode = Readonly<{
  kind: NodeKind.EnumCaseDecl
  jsDoc?: SourceAst.Doc
  attributes?: AttributeListNode
  modifiers?: DeclModifierListNode
  elements: EnumCaseElementListNode
}>

export type EnumDeclNode = Readonly<{
  kind: NodeKind.EnumDecl
  jsDoc?: SourceAst.Doc
  attributes?: AttributeListNode
  modifiers?: DeclModifierListNode
  name: Token
  genericParameterClause?: GenericParameterClause
  inheritanceClause?: InheritanceClauseNode
  memberBlock: MemberBlockNode
}>

export type InitializerDeclNode = Readonly<{
  kind: NodeKind.InitializerDecl
  jsDoc?: SourceAst.Doc
  attributes?: AttributeListNode
  modifiers?: DeclModifierListNode
  optionalMark?: Token
  genericParameterClause?: GenericParameterClause
  signature: FunctionSignatureNode
  body: CodeBlockNode
}>

export type StructDeclNode = Readonly<{
  kind: NodeKind.StructDecl
  jsDoc?: SourceAst.Doc
  attributes?: AttributeListNode
  modifiers?: DeclModifierListNode
  name: Token
  genericParameterClause?: GenericParameterClause
  inheritanceClause?: InheritanceClauseNode
  memberBlock: MemberBlockNode
}>

export type TypeAliasDeclNode = Readonly<{
  kind: NodeKind.TypeAliasDecl
  jsDoc?: SourceAst.Doc
  attributes?: AttributeListNode
  modifiers?: DeclModifierListNode
  name: Token
  genericParameterClause?: GenericParameterClause
  initializer: TypeInitializerClauseNode
}>

export type VariableDeclNode = Readonly<{
  kind: NodeKind.VariableDecl
  jsDoc?: SourceAst.Doc
  attributes?: AttributeListNode
  modifiers?: DeclModifierListNode
  bindingSpecifier: Token
  bindings: PatternBindingListNode
}>

//#endregion

//#region Expressions

export type ExprNode =
  | AssignmentExprNode
  | BinaryOperatorExprNode
  | BooleanLiteralExprNode
  | DeclReferenceExprNode
  | FloatLiteralExprNode
  | InfixOperatorExprNode
  | IntegerLiteralExprNode
  | MemberAccessExprNode
  | NilLiteralExprNode
  | StringLiteralExprNode

export type AssignmentExprNode = Readonly<{
  kind: NodeKind.AssignmentExpr
}>

export type BinaryOperatorExprNode = Readonly<{
  kind: NodeKind.BinaryOperatorExpr
  operator: BinaryOperatorToken
}>

export type BooleanLiteralExprNode = Readonly<{
  kind: NodeKind.BooleanLiteralExpr
  value: boolean
}>

export type DeclReferenceExprNode = Readonly<{
  kind: NodeKind.DeclReferenceExpr
  baseName: Token
}>

export type FloatLiteralExprNode = Readonly<{
  kind: NodeKind.FloatLiteralExpr
  value: number
}>

export type InfixOperatorExprNode = Readonly<{
  kind: NodeKind.InfixOperatorExpr
  leftOperand: ExprNode
  operator: ExprNode
  rightOperand: ExprNode
}>

export type IntegerLiteralExprNode = Readonly<{
  kind: NodeKind.IntegerLiteralExpr
  value: number
}>

export type MemberAccessExprNode = Readonly<{
  kind: NodeKind.MemberAccessExpr
  base?: ExprNode
  declName: DeclReferenceExprNode
}>

export type NilLiteralExprNode = Readonly<{
  kind: NodeKind.NilLiteralExpr
}>

export type StringLiteralExprNode = Readonly<{
  kind: NodeKind.StringLiteralExpr
  value: string
}>

//#endregion

//#region Patterns

export type PatternNode = IdentifierPatternNode

export type IdentifierPatternNode = Readonly<{
  kind: NodeKind.IdentifierPattern
  name: string
}>

//#endregion

//#region Statements

export type StmtNode = ExpressionStmtNode

export type ExpressionStmtNode = Readonly<{
  kind: NodeKind.ExpressionStmt
  expression: ExprNode
}>

//#endregion

//#region Types

export type TypeNode =
  | ArrayTypeNode
  | CompositionTypeNode
  | DictionaryTypeNode
  | IdentifierTypeNode
  | OptionalTypeNode
  | TupleTypeNode

export type ArrayTypeNode = Readonly<{
  kind: NodeKind.ArrayType
  element: TypeNode
}>

export type CompositionTypeNode = Readonly<{
  kind: NodeKind.CompositionType
  elements: CompositionTypeElementListNode
}>

export type DictionaryTypeNode = Readonly<{
  kind: NodeKind.DictionaryType
  key: TypeNode
  value: TypeNode
}>

export type IdentifierTypeNode = Readonly<{
  kind: NodeKind.IdentifierType
  name: Token
  genericArgumentClause?: GenericArgumentClause
}>

export type OptionalTypeNode = Readonly<{
  kind: NodeKind.OptionalType
  wrappedType: TypeNode
}>

export type TupleTypeNode = Readonly<{
  kind: NodeKind.TupleType
  elements: TupleTypeElementListNode
}>

//#endregion

//#region Collections

export type AvailabilityArgumentListNode = Readonly<{
  kind: NodeKind.AvailabilityArgumentList
  arguments: readonly AvailabilityArgumentNode[]
}>

export type AvailabilityArgumentNode = Readonly<{
  kind: NodeKind.AvailabilityArgument
  argument: AvailabilityArgumentNode_Argument
}>

export type AvailabilityArgumentNode_Argument =
  | AvailabilityLabeledArgumentNode
  | AvailabilityTokenArgumentNode

export type CodeBlockItemListNode = Readonly<{
  kind: NodeKind.CodeBlockItemList
  elements: readonly CodeBlockItemNode[]
}>

export type CodeBlockItemNode = Readonly<{
  kind: NodeKind.CodeBlockItem
  item: CodeBlockItemNode_Item
}>

export type CodeBlockItemNode_Item = DeclNode | StmtNode | ExprNode

export type CompositionTypeElementListNode = Readonly<{
  kind: NodeKind.CompositionTypeElementList
  elements: readonly CompositionTypeElementNode[]
}>

export type CompositionTypeElementNode = Readonly<{
  kind: NodeKind.CompositionTypeElement
  type: TypeNode
}>

export type DeclModifierListNode = Readonly<{
  kind: NodeKind.DeclModifierList
  modifiers: readonly DeclModifierNode[]
}>

export type DeclModifierNode = Readonly<{
  kind: NodeKind.DeclModifier
  name: Token
  detail?: Token
}>

export type EnumCaseElementListNode = Readonly<{
  kind: NodeKind.EnumCaseElementList
  elements: readonly EnumCaseElementNode[]
}>

export type EnumCaseElementNode = Readonly<{
  kind: NodeKind.EnumCaseElement
  name: Token
  parameterClause?: EnumCaseParameterClauseNode
  rawValue?: InitializerClauseNode
}>

export type EnumCaseParameterListNode = Readonly<{
  kind: NodeKind.EnumCaseParameterList
  parameters: readonly EnumCaseParameterNode[]
}>

export type EnumCaseParameterNode = Readonly<{
  kind: NodeKind.EnumCaseParameter
  firstName?: Token
  secondName?: Token
  type: TypeNode
}>

export type FunctionParameterList = Readonly<{
  kind: NodeKind.FunctionParameterList
  parameters: readonly FunctionParameterNode[]
}>

export type FunctionParameterNode = Readonly<{
  kind: NodeKind.FunctionParameter
  attributes?: AttributeListNode
  modifiers?: DeclModifierListNode
  firstName?: Token
  secondName?: Token
  type: TypeNode
  defaultValue?: InitializerClauseNode
}>

export type GenericArgumentListNode = Readonly<{
  kind: NodeKind.GenericArgumentList
  arguments: readonly GenericArgumentNode[]
}>

export type GenericArgumentNode = Readonly<{
  kind: NodeKind.GenericArgument
  argument: TypeNode
}>

export type GenericParameterListNode = Readonly<{
  kind: NodeKind.GenericParameterList
  parameters: readonly GenericParameterNode[]
}>

export type GenericParameterNode = Readonly<{
  kind: NodeKind.GenericParameter
  name: Token
  inheritedType?: TypeNode
}>

export type InheritanceTypeListNode = Readonly<{
  kind: NodeKind.InheritanceTypeList
  types: readonly InheritanceTypeNode[]
}>

export type InheritanceTypeNode = Readonly<{
  kind: NodeKind.InheritanceType
  type: TypeNode
}>

export type MemberBlockItemListNode = Readonly<{
  kind: NodeKind.MemberBlockItemList
  items: readonly MemberBlockItemNode[]
}>

export type MemberBlockItemNode = Readonly<{
  kind: NodeKind.MemberBlockItem
  decl: DeclNode
}>

export type PatternBindingListNode = Readonly<{
  kind: NodeKind.PatternBindingList
  bindings: readonly PatternBindingNode[]
}>

export type PatternBindingNode = Readonly<{
  kind: NodeKind.PatternBinding
  pattern: PatternNode
  typeAnnotation?: TypeAnnotationNode
  initializer?: InitializerClauseNode
}>

export type TupleTypeElementListNode = Readonly<{
  kind: NodeKind.TupleTypeElementList
  elements: readonly TupleTypeElementNode[]
}>

export type TupleTypeElementNode = Readonly<{
  kind: NodeKind.TupleTypeElement
  firstName?: Token
  secondName?: Token
  type: TypeNode
}>

//#endregion

//#region Attributes

export type AttributeListNode = Readonly<{
  kind: NodeKind.AttributeList
  attributes: readonly AttributeNode[]
}>

export type AttributeNode = Readonly<{
  kind: NodeKind.Attribute
  attributeName: TypeNode
  arguments: AttributeNode_Arguments
}>

export type AttributeNode_Arguments = AvailabilityArgumentListNode

//#endregion

//#region Miscellaneous Nodes

export type AvailabilityLabeledArgumentNode = Readonly<{
  kind: NodeKind.AvailabilityLabeledArgument
  label: "message" | "renamed" | "introduced" | "obsoleted" | "deprecated"
  value: string
}>

export type AvailabilityTokenArgumentNode = Readonly<{
  kind: NodeKind.AvailabilityTokenArgument
  token: Token
}>

export type CodeBlockNode = Readonly<{
  kind: NodeKind.CodeBlock
  statements: CodeBlockItemListNode
}>

export type EnumCaseParameterClauseNode = Readonly<{
  kind: NodeKind.EnumCaseParameterClause
  parameters: EnumCaseParameterListNode
}>

export type FunctionEffectSpecifiersNode = Readonly<{
  kind: NodeKind.FunctionEffectSpecifiers
  asyncSpecifier?: Token
  throwsClause?: ThrowsClauseNode
}>

export type FunctionParameterClauseNode = Readonly<{
  kind: NodeKind.FunctionParameterClause
  parameters: FunctionParameterList
}>

export type FunctionSignatureNode = Readonly<{
  kind: NodeKind.FunctionSignature
  parameterClause: FunctionParameterClauseNode
  effectSpecifiers?: FunctionEffectSpecifiersNode
  returnClause?: ReturnClauseNode
}>

export type GenericArgumentClause = Readonly<{
  kind: NodeKind.GenericArgumentClause
  arguments: GenericArgumentListNode
}>

export type GenericParameterClause = Readonly<{
  kind: NodeKind.GenericParameterClause
  parameters: GenericParameterListNode
}>

export type InheritanceClauseNode = Readonly<{
  kind: NodeKind.InheritanceClause
  inheritedTypes: InheritanceTypeListNode
}>

export type InitializerClauseNode = Readonly<{
  kind: NodeKind.InitializerClause
  value: ExprNode
}>

export type MemberBlockNode = Readonly<{
  kind: NodeKind.MemberBlock
  members: MemberBlockItemListNode
}>

export type ReturnClauseNode = Readonly<{
  kind: NodeKind.ReturnClause
  type: TypeNode
}>

export type ThrowsClauseNode = Readonly<{
  kind: NodeKind.ThrowsClause
  throwsSpecifier: Token
  type?: TypeNode
}>

export type TypeAnnotationNode = Readonly<{
  kind: NodeKind.TypeAnnotation
  type: TypeNode
}>

export type TypeInitializerClauseNode = Readonly<{
  kind: NodeKind.TypeInitializerClause
  value: TypeNode
}>

//#endregion

export const identifierToken = (identifier: string): IdentifierToken => ({
  kind: TokenKind.Identifier,
  identifier,
})

export const keywordToken = (keyword: Keyword): KeywordToken => ({
  kind: TokenKind.Keyword,
  keyword,
})

export const binaryOperatorToken = (operator: string): BinaryOperatorToken => ({
  kind: TokenKind.BinaryOperator,
  operator,
})

const cleanupUndefinedKeys = <T extends object>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as T

const accessControlModifier = (
  options: TransformOptions
): DeclModifierListNode | undefined =>
  options.defaultPublic === true
    ? {
        kind: NodeKind.DeclModifierList,
        modifiers: [
          {
            kind: NodeKind.DeclModifier,
            name: { kind: TokenKind.Keyword, keyword: Keyword.public },
          },
        ],
      }
    : undefined

const deprecatedDocToAttribute = (
  jsDoc: SourceAst.Doc | undefined
): AttributeListNode | undefined => {
  const deprecated = jsDoc?.tags.deprecated
  return deprecated !== undefined
    ? {
        kind: NodeKind.AttributeList,
        attributes: [
          {
            kind: NodeKind.Attribute,
            attributeName: {
              kind: NodeKind.IdentifierType,
              name: identifierToken("available"),
            },
            arguments: {
              kind: NodeKind.AvailabilityArgumentList,
              arguments: filterNonNullable<
                AvailabilityArgumentNode | undefined
              >([
                {
                  kind: NodeKind.AvailabilityArgument,
                  argument: {
                    kind: NodeKind.AvailabilityTokenArgument,
                    token: { kind: TokenKind.BinaryOperator, operator: "*" },
                  },
                },
                {
                  kind: NodeKind.AvailabilityArgument,
                  argument: {
                    kind: NodeKind.AvailabilityTokenArgument,
                    token: {
                      kind: TokenKind.Keyword,
                      keyword: Keyword.deprecated,
                    },
                  },
                },
                deprecated.length === 0
                  ? undefined
                  : {
                      kind: NodeKind.AvailabilityArgument,
                      argument: {
                        kind: NodeKind.AvailabilityLabeledArgument,
                        label: "message",
                        value: deprecated,
                      },
                    },
              ]),
            },
          },
        ],
      }
    : undefined
}

const childNodeToTypeNode = (
  node: SourceAst.ChildNode,
  options: TransformOptions
): TypeNode => {
  switch (node.kind) {
    case SourceAst.NodeKind.Record:
      throw new Error("Anonymous structs are not supported in Swift")
    case SourceAst.NodeKind.Dictionary:
      return {
        kind: NodeKind.DictionaryType,
        key: { kind: NodeKind.IdentifierType, name: identifierToken("String") },
        value: childNodeToTypeNode(node.children, options),
      }
    case SourceAst.NodeKind.Token:
      switch (node.token) {
        case SourceAst.TokenKind.String:
          return {
            kind: NodeKind.IdentifierType,
            name: identifierToken("String"),
          }
        case SourceAst.TokenKind.Number:
          return {
            kind: NodeKind.IdentifierType,
            name: identifierToken("Int"),
          }
        case SourceAst.TokenKind.Boolean:
          return {
            kind: NodeKind.IdentifierType,
            name: identifierToken("Bool"),
          }
      }
    case SourceAst.NodeKind.Reference:
      return cleanupUndefinedKeys({
        kind: NodeKind.IdentifierType,
        name: identifierToken(
          forcePascal(renderQualifiedName(node.name), options)
        ),
        genericArgumentClause:
          node.typeArguments === undefined
            ? undefined
            : {
                kind: NodeKind.GenericArgumentClause,
                arguments: {
                  kind: NodeKind.GenericArgumentList,
                  arguments: node.typeArguments?.map((arg) => ({
                    kind: NodeKind.GenericArgument,
                    argument: childNodeToTypeNode(arg, options),
                  })),
                },
              },
      })
    case SourceAst.NodeKind.Array:
      return {
        kind: NodeKind.ArrayType,
        element: childNodeToTypeNode(node.children, options),
      }
    case SourceAst.NodeKind.Union:
      throw new Error("Anonymous union nodes are not supported in Swift")
    case SourceAst.NodeKind.Literal:
      if (typeof node.value === "string") {
        return {
          kind: NodeKind.IdentifierType,
          name: identifierToken("String"),
        }
      }
      if (typeof node.value === "number") {
        return {
          kind: NodeKind.IdentifierType,
          name: Number.isInteger(node.value)
            ? identifierToken("Int")
            : identifierToken("Double"),
        }
      }
      if (typeof node.value === "boolean") {
        return {
          kind: NodeKind.IdentifierType,
          name: identifierToken("Bool"),
        }
      }

      return node.value
    case SourceAst.NodeKind.Tuple:
      return {
        kind: NodeKind.TupleType,
        elements: {
          kind: NodeKind.TupleTypeElementList,
          elements: node.children.map((child) => ({
            kind: NodeKind.TupleTypeElement,
            type: childNodeToTypeNode(child, options),
          })),
        },
      }
    case SourceAst.NodeKind.Intersection:
      return {
        kind: NodeKind.CompositionType,
        elements: {
          kind: NodeKind.CompositionTypeElementList,
          elements: node.children.map((child) => ({
            kind: NodeKind.CompositionTypeElement,
            type: childNodeToTypeNode(child, options),
          })),
        },
      }
  }
}

const renderQualifiedName = (name: SourceAst.QualifiedName): string =>
  name.right === undefined ? name.segment : renderQualifiedName(name.right)

const toCamel = (name: string): string => {
  if (name === "") {
    return name
  }

  const joined = name.replace(/[_\- ]([A-Za-z])/g, (_, letter) =>
    letter.toUpperCase()
  )
  return joined[0]!.toLowerCase() + joined.slice(1)
}

const toPascal = (name: string): string => {
  if (name === "") {
    return name
  }

  const joined = name.replace(/[_\- ]([A-Za-z])/g, (_, letter) =>
    letter.toUpperCase()
  )
  return joined[0]!.toUpperCase() + joined.slice(1)
}

const forceCamel = (name: string, options: TransformOptions): string =>
  options.convertIdentifiersToNamingConvention === true ? toCamel(name) : name

const forcePascal = (name: string, options: TransformOptions): string =>
  options.convertIdentifiersToNamingConvention === true ? toPascal(name) : name

const keywords = (() => {
  const keywordMap: { [K in Keyword]: K } = {
    Any: Keyword.Any,
    Protocol: Keyword.Protocol,
    Self: Keyword.Self,
    Sendable: Keyword.Sendable,
    Type: Keyword.Type,
    accesses: Keyword.accesses,
    actor: Keyword.actor,
    addressWithNativeOwner: Keyword.addressWithNativeOwner,
    addressWithOwner: Keyword.addressWithOwner,
    any: Keyword.any,
    as: Keyword.as,
    assignment: Keyword.assignment,
    associatedtype: Keyword.associatedtype,
    associativity: Keyword.associativity,
    async: Keyword.async,
    attached: Keyword.attached,
    autoclosure: Keyword.autoclosure,
    availability: Keyword.availability,
    available: Keyword.available,
    await: Keyword.await,
    backDeployed: Keyword.backDeployed,
    before: Keyword.before,
    block: Keyword.block,
    borrowing: Keyword.borrowing,
    break: Keyword.break,
    cType: Keyword.cType,
    canImport: Keyword.canImport,
    case: Keyword.case,
    catch: Keyword.catch,
    class: Keyword.class,
    compiler: Keyword.compiler,
    consume: Keyword.consume,
    consuming: Keyword.consuming,
    continue: Keyword.continue,
    convenience: Keyword.convenience,
    convention: Keyword.convention,
    copy: Keyword.copy,
    default: Keyword.default,
    defer: Keyword.defer,
    deinit: Keyword.deinit,
    deprecated: Keyword.deprecated,
    derivative: Keyword.derivative,
    didSet: Keyword.didSet,
    differentiable: Keyword.differentiable,
    discard: Keyword.discard,
    distributed: Keyword.distributed,
    do: Keyword.do,
    dynamic: Keyword.dynamic,
    each: Keyword.each,
    else: Keyword.else,
    enum: Keyword.enum,
    escaping: Keyword.escaping,
    exclusivity: Keyword.exclusivity,
    exported: Keyword.exported,
    extension: Keyword.extension,
    fallthrough: Keyword.fallthrough,
    false: Keyword.false,
    file: Keyword.file,
    fileprivate: Keyword.fileprivate,
    final: Keyword.final,
    for: Keyword.for,
    forward: Keyword.forward,
    freestanding: Keyword.freestanding,
    func: Keyword.func,
    get: Keyword.get,
    guard: Keyword.guard,
    higherThan: Keyword.higherThan,
    if: Keyword.if,
    import: Keyword.import,
    in: Keyword.in,
    indirect: Keyword.indirect,
    infix: Keyword.infix,
    init: Keyword.init,
    initializes: Keyword.initializes,
    inline: Keyword.inline,
    inout: Keyword.inout,
    internal: Keyword.internal,
    introduced: Keyword.introduced,
    is: Keyword.is,
    isolated: Keyword.isolated,
    kind: Keyword.kind,
    lazy: Keyword.lazy,
    left: Keyword.left,
    let: Keyword.let,
    line: Keyword.line,
    linear: Keyword.linear,
    lowerThan: Keyword.lowerThan,
    macro: Keyword.macro,
    message: Keyword.message,
    metadata: Keyword.metadata,
    module: Keyword.module,
    mutableAddressWithNativeOwner: Keyword.mutableAddressWithNativeOwner,
    mutableAddressWithOwner: Keyword.mutableAddressWithOwner,
    mutating: Keyword.mutating,
    nil: Keyword.nil,
    noDerivative: Keyword.noDerivative,
    noasync: Keyword.noasync,
    noescape: Keyword.noescape,
    none: Keyword.none,
    nonisolated: Keyword.nonisolated,
    nonmutating: Keyword.nonmutating,
    objc: Keyword.objc,
    obsoleted: Keyword.obsoleted,
    of: Keyword.of,
    open: Keyword.open,
    operator: Keyword.operator,
    optional: Keyword.optional,
    override: Keyword.override,
    package: Keyword.package,
    postfix: Keyword.postfix,
    precedencegroup: Keyword.precedencegroup,
    preconcurrency: Keyword.preconcurrency,
    prefix: Keyword.prefix,
    private: Keyword.private,
    protocol: Keyword.protocol,
    public: Keyword.public,
    reasync: Keyword.reasync,
    renamed: Keyword.renamed,
    repeat: Keyword.repeat,
    required: Keyword.required,
    rethrows: Keyword.rethrows,
    retroactive: Keyword.retroactive,
    return: Keyword.return,
    reverse: Keyword.reverse,
    right: Keyword.right,
    safe: Keyword.safe,
    self: Keyword.self,
    sending: Keyword.sending,
    set: Keyword.set,
    some: Keyword.some,
    sourceFile: Keyword.sourceFile,
    spi: Keyword.spi,
    spiModule: Keyword.spiModule,
    static: Keyword.static,
    struct: Keyword.struct,
    subscript: Keyword.subscript,
    super: Keyword.super,
    swift: Keyword.swift,
    switch: Keyword.switch,
    target: Keyword.target,
    then: Keyword.then,
    throw: Keyword.throw,
    throws: Keyword.throws,
    transpose: Keyword.transpose,
    true: Keyword.true,
    try: Keyword.try,
    typealias: Keyword.typealias,
    unavailable: Keyword.unavailable,
    unchecked: Keyword.unchecked,
    unowned: Keyword.unowned,
    unsafe: Keyword.unsafe,
    unsafeAddress: Keyword.unsafeAddress,
    unsafeMutableAddress: Keyword.unsafeMutableAddress,
    var: Keyword.var,
    visibility: Keyword.visibility,
    weak: Keyword.weak,
    where: Keyword.where,
    while: Keyword.while,
    willSet: Keyword.willSet,
    witness_method: Keyword.witness_method,
    wrt: Keyword.wrt,
    yield: Keyword.yield,
  }
  return new Set(Object.keys(keywordMap))
})()

const safeIdentifier = (name: string): string =>
  /[^a-zA-Z0-9_]/.test(name) || keywords.has(name) ? `\`${name}\`` : name

const typeParameterNodesToGenericParameterClause = (
  nodes: SourceAst.TypeParameterNode[] | undefined,
  options: TransformOptions
): GenericParameterClause | undefined =>
  nodes === undefined
    ? undefined
    : {
        kind: NodeKind.GenericParameterClause,
        parameters: {
          kind: NodeKind.GenericParameterList,
          parameters: nodes.map((node) => ({
            kind: NodeKind.GenericParameter,
            name: identifierToken(forcePascal(node.name, options)),
            inheritedType: node.constraint
              ? childNodeToTypeNode(node.constraint, options)
              : undefined,
          })),
        },
      }

const childNodeToDeclNode = (
  name: string,
  jsDoc: SourceAst.Doc | undefined,
  typeParameters: SourceAst.TypeParameterNode[] | undefined,
  node: SourceAst.ChildNode,
  options: TransformOptions
): DeclNode => {
  switch (node.kind) {
    case SourceAst.NodeKind.Record: {
      return cleanupUndefinedKeys<StructDeclNode>({
        kind: NodeKind.StructDecl,
        jsDoc,
        name: identifierToken(forcePascal(name, options)),
        attributes: deprecatedDocToAttribute(jsDoc),
        modifiers: accessControlModifier(options),
        genericParameterClause: typeParameterNodesToGenericParameterClause(
          typeParameters,
          options
        ),
        memberBlock: {
          kind: NodeKind.MemberBlock,
          members: {
            kind: NodeKind.MemberBlockItemList,
            items: filterNonNullable([
              ...node.members.map(
                (member): MemberBlockItemNode => ({
                  kind: NodeKind.MemberBlockItem,
                  decl: cleanupUndefinedKeys<VariableDeclNode>({
                    kind: NodeKind.VariableDecl,
                    jsDoc: member.jsDoc,
                    attributes: deprecatedDocToAttribute(member.jsDoc),
                    modifiers: accessControlModifier(options),
                    bindingSpecifier:
                      options.forceConstantStructMembers ?? member.isReadOnly
                        ? keywordToken(Keyword.let)
                        : keywordToken(Keyword.var),
                    bindings: {
                      kind: NodeKind.PatternBindingList,
                      bindings: [
                        {
                          kind: NodeKind.PatternBinding,
                          pattern: {
                            kind: NodeKind.IdentifierPattern,
                            name: safeIdentifier(
                              forceCamel(member.identifier, options)
                            ),
                          },
                          typeAnnotation: {
                            kind: NodeKind.TypeAnnotation,
                            type: member.isRequired
                              ? childNodeToTypeNode(member.value, options)
                              : {
                                  kind: NodeKind.OptionalType,
                                  wrappedType: childNodeToTypeNode(
                                    member.value,
                                    options
                                  ),
                                },
                          },
                        },
                      ],
                    },
                  }),
                })
              ),
              options.generateStructInitializers === true
                ? {
                    kind: NodeKind.MemberBlockItem,
                    decl: {
                      kind: NodeKind.InitializerDecl,
                      modifiers: accessControlModifier(options),
                      signature: {
                        kind: NodeKind.FunctionSignature,
                        parameterClause: {
                          kind: NodeKind.FunctionParameterClause,
                          parameters: {
                            kind: NodeKind.FunctionParameterList,
                            parameters: node.members.map(
                              (member): FunctionParameterNode =>
                                cleanupUndefinedKeys<FunctionParameterNode>({
                                  kind: NodeKind.FunctionParameter,
                                  firstName: identifierToken(
                                    safeIdentifier(
                                      forceCamel(member.identifier, options)
                                    )
                                  ),
                                  type: member.isRequired
                                    ? childNodeToTypeNode(member.value, options)
                                    : {
                                        kind: NodeKind.OptionalType,
                                        wrappedType: childNodeToTypeNode(
                                          member.value,
                                          options
                                        ),
                                      },
                                  defaultValue: member.isRequired
                                    ? undefined
                                    : {
                                        kind: NodeKind.InitializerClause,
                                        value: {
                                          kind: NodeKind.NilLiteralExpr,
                                        },
                                      },
                                })
                            ),
                          },
                        },
                      },
                      body: {
                        kind: NodeKind.CodeBlock,
                        statements: {
                          kind: NodeKind.CodeBlockItemList,
                          elements: node.members.map(
                            (member): CodeBlockItemNode => ({
                              kind: NodeKind.CodeBlockItem,
                              item: {
                                kind: NodeKind.InfixOperatorExpr,
                                leftOperand: {
                                  kind: NodeKind.MemberAccessExpr,
                                  base: {
                                    kind: NodeKind.DeclReferenceExpr,
                                    baseName: keywordToken(Keyword.self),
                                  },
                                  declName: {
                                    kind: NodeKind.DeclReferenceExpr,
                                    baseName: identifierToken(
                                      safeIdentifier(
                                        forceCamel(member.identifier, options)
                                      )
                                    ),
                                  },
                                },
                                operator: {
                                  kind: NodeKind.AssignmentExpr,
                                },
                                rightOperand: {
                                  kind: NodeKind.DeclReferenceExpr,
                                  baseName: identifierToken(
                                    safeIdentifier(
                                      forceCamel(member.identifier, options)
                                    )
                                  ),
                                },
                              },
                            })
                          ),
                        },
                      },
                    },
                  }
                : undefined,
            ]),
          },
        },
      })
      // if (
      //   child.members.find((member) => member.identifier === "tag")?.value
      //     .kind === SourceAst.NodeKind.Literal
      // ) {
      //   return renderDeclaration(
      //     name,
      //     jsDoc,
      //     typeParameters,
      //     {
      //       kind: SourceAst.NodeKind.Union,
      //       jsDoc: child.jsDoc,
      //       fileName: child.fileName,
      //       children: [child],
      //     },
      //     main
      //   )
      // }
      //       return `${renderDocumentation(
      //         jsDoc
      //       )}public struct ${name}${renderTypeParameters(
      //         typeParameters,
      //         "EntitySubtype"
      //       )}: ${
      //         name === main
      //           ? child.members.find((member) => member.identifier === "translations")
      //               ?.isRequired === true
      //             ? "LocalizableEntity"
      //             : "Entity"
      //           : "EntitySubtype"
      //       } {
      // ${applyIndentation(
      //   1,
      //   child.members
      //     .map(
      //       ({ identifier: key, isRequired, value, jsDoc }) =>
      //         `${renderDocumentation(jsDoc)}${renderDeprecation(
      //           jsDoc
      //         )}public let ${safeIdentifier(snakeToCamel(key))}: ${renderChild(
      //           value
      //         )}${isRequired ? "" : "?"}`
      //     )
      //     .join("\n\n")
      // )}
      // ${applyIndentation(
      //   1,
      //   `public init(${child.members
      //     .map(
      //       ({ identifier: key, value, isRequired }) =>
      //         `${safeIdentifier(snakeToCamel(key))}: ${renderChild(value)}${
      //           isRequired ? "" : "? = nil"
      //         }`
      //     )
      //     .join(", ")}) {
      // ${applyIndentation(
      //   1,
      //   child.members
      //     .map(
      //       ({ identifier: key }) =>
      //         `self.${safeIdentifier(snakeToCamel(key))} = ${safeIdentifier(
      //           snakeToCamel(key)
      //         )}`
      //     )
      //     .join("\n")
      // )}
      // }`
      // )}${
      //         child.members.some(({ identifier: key }) => key.includes("_"))
      //           ? applyIndentation(
      //               1,
      //               `\n\nprivate enum CodingKeys: String, CodingKey {
      // ${applyIndentation(
      //   1,
      //   child.members
      //     .map(
      //       ({ identifier: key }) =>
      //         `case ${safeIdentifier(snakeToCamel(key))} = "${key}"`
      //     )
      //     .join("\n")
      // )}
      // }`
      //             )
      //           : ""
      //       }
      // }`
    }
    case SourceAst.NodeKind.Dictionary:
    case SourceAst.NodeKind.Token:
    case SourceAst.NodeKind.Reference:
    case SourceAst.NodeKind.Array:
    case SourceAst.NodeKind.Tuple:
    case SourceAst.NodeKind.Intersection:
      return cleanupUndefinedKeys<TypeAliasDeclNode>({
        kind: NodeKind.TypeAliasDecl,
        jsDoc,
        name: identifierToken(forcePascal(name, options)),
        attributes: deprecatedDocToAttribute(jsDoc),
        modifiers: accessControlModifier(options),
        genericParameterClause: typeParameterNodesToGenericParameterClause(
          typeParameters,
          options
        ),
        initializer: {
          kind: NodeKind.TypeInitializerClause,
          value: childNodeToTypeNode(node, options),
        },
      })
    case SourceAst.NodeKind.Union:
      if (
        options?.enumerationSynthesizationDiscriminatorKey !== undefined &&
        node.children.every((caseNode) => {
          const tagMember =
            caseNode.kind === SourceAst.NodeKind.Record
              ? caseNode.members.find(
                  (member) =>
                    member.identifier ===
                    options.enumerationSynthesizationDiscriminatorKey
                )
              : undefined
          return (
            tagMember?.value.kind === SourceAst.NodeKind.Literal &&
            typeof tagMember.value.value === "string"
          )
        })
      ) {
        return cleanupUndefinedKeys<EnumDeclNode>({
          kind: NodeKind.EnumDecl,
          jsDoc,
          name: identifierToken(forcePascal(name, options)),
          attributes: deprecatedDocToAttribute(jsDoc),
          modifiers: accessControlModifier(options),
          genericParameterClause: typeParameterNodesToGenericParameterClause(
            typeParameters,
            options
          ),
          memberBlock: {
            kind: NodeKind.MemberBlock,
            members: {
              kind: NodeKind.MemberBlockItemList,
              items: (node.children as SourceAst.RecordNode[]).map(
                (member): MemberBlockItemNode => {
                  const tag = (
                    member.members.find(
                      (member) =>
                        member.identifier ===
                        options.enumerationSynthesizationDiscriminatorKey
                    )!.value as SourceAst.LiteralNode
                  ).value as string
                  const value = member.members.find(
                    (recordMember) =>
                      recordMember.identifier !==
                      options.enumerationSynthesizationDiscriminatorKey
                  )!.value

                  return {
                    kind: NodeKind.MemberBlockItem,
                    decl: {
                      kind: NodeKind.EnumCaseDecl,
                      jsDoc: member.jsDoc,
                      attributes: deprecatedDocToAttribute(member.jsDoc),
                      elements: {
                        kind: NodeKind.EnumCaseElementList,
                        elements: [
                          cleanupUndefinedKeys<EnumCaseElementNode>({
                            kind: NodeKind.EnumCaseElement,
                            name: identifierToken(
                              safeIdentifier(forceCamel(tag, options))
                            ),
                            parameterClause:
                              value.kind === SourceAst.NodeKind.Record &&
                              value.members.length === 0
                                ? undefined
                                : {
                                    kind: NodeKind.EnumCaseParameterClause,
                                    parameters: {
                                      kind: NodeKind.EnumCaseParameterList,
                                      parameters: [
                                        {
                                          kind: NodeKind.EnumCaseParameter,
                                          type: childNodeToTypeNode(
                                            value,
                                            options
                                          ),
                                        },
                                      ],
                                    },
                                  },
                          }),
                        ],
                      },
                    },
                  }
                }
              ),
            },
          },
        })
      }

      if (node.children.every(SourceAst.isReferenceNode)) {
        return cleanupUndefinedKeys<EnumDeclNode>({
          kind: NodeKind.EnumDecl,
          jsDoc,
          name: identifierToken(forcePascal(name, options)),
          attributes: deprecatedDocToAttribute(jsDoc),
          genericParameterClause: typeParameterNodesToGenericParameterClause(
            typeParameters,
            options
          ),
          memberBlock: {
            kind: NodeKind.MemberBlock,
            members: {
              kind: NodeKind.MemberBlockItemList,
              items: node.children.map((ref): MemberBlockItemNode => {
                return {
                  kind: NodeKind.MemberBlockItem,
                  decl: {
                    kind: NodeKind.EnumCaseDecl,
                    jsDoc: ref.jsDoc,
                    attributes: deprecatedDocToAttribute(ref.jsDoc),
                    elements: {
                      kind: NodeKind.EnumCaseElementList,
                      elements: [
                        {
                          kind: NodeKind.EnumCaseElement,
                          name: identifierToken(
                            safeIdentifier(
                              forceCamel(renderQualifiedName(ref.name), options)
                            )
                          ),
                          parameterClause: {
                            kind: NodeKind.EnumCaseParameterClause,
                            parameters: {
                              kind: NodeKind.EnumCaseParameterList,
                              parameters: [
                                {
                                  kind: NodeKind.EnumCaseParameter,
                                  type: childNodeToTypeNode(ref, options),
                                },
                              ],
                            },
                          },
                        },
                      ],
                    },
                  },
                }
              }),
            },
          },
        })
      }

      if (
        node.children.every(SourceAst.isLiteralNode) &&
        node.children.every((node) => typeof node.value === "string")
      ) {
        return cleanupUndefinedKeys<EnumDeclNode>({
          kind: NodeKind.EnumDecl,
          jsDoc,
          attributes: deprecatedDocToAttribute(jsDoc),
          modifiers: accessControlModifier(options),
          name: identifierToken(forcePascal(name, options)),
          inheritanceClause: {
            kind: NodeKind.InheritanceClause,
            inheritedTypes: {
              kind: NodeKind.InheritanceTypeList,
              types: [
                {
                  kind: NodeKind.InheritanceType,
                  type: {
                    kind: NodeKind.IdentifierType,
                    name: identifierToken("String"),
                  },
                },
              ],
            },
          },
          memberBlock: {
            kind: NodeKind.MemberBlock,
            members: {
              kind: NodeKind.MemberBlockItemList,
              items: node.children.map((literal): MemberBlockItemNode => {
                return {
                  kind: NodeKind.MemberBlockItem,
                  decl: {
                    kind: NodeKind.EnumCaseDecl,
                    jsDoc: literal.jsDoc,
                    attributes: deprecatedDocToAttribute(literal.jsDoc),
                    elements: {
                      kind: NodeKind.EnumCaseElementList,
                      elements: [
                        {
                          kind: NodeKind.EnumCaseElement,
                          name: identifierToken(
                            safeIdentifier(
                              forceCamel(literal.value as string, options)
                            )
                          ),
                          rawValue: {
                            kind: NodeKind.InitializerClause,
                            value: {
                              kind: NodeKind.StringLiteralExpr,
                              value: literal.value as string,
                            },
                          },
                        },
                      ],
                    },
                  },
                }
              }),
            },
          },
        })
      }

      if (
        node.children.every(SourceAst.isLiteralNode) &&
        node.children.every((node) => typeof node.value === "number")
      ) {
        const isInt = node.children.every((node) =>
          Number.isInteger(node.value)
        )
        const rawType = isInt ? "Int" : "Double"
        return cleanupUndefinedKeys<EnumDeclNode>({
          kind: NodeKind.EnumDecl,
          jsDoc,
          attributes: deprecatedDocToAttribute(jsDoc),
          modifiers: accessControlModifier(options),
          name: identifierToken(forcePascal(name, options)),
          inheritanceClause: {
            kind: NodeKind.InheritanceClause,
            inheritedTypes: {
              kind: NodeKind.InheritanceTypeList,
              types: [
                {
                  kind: NodeKind.InheritanceType,
                  type: {
                    kind: NodeKind.IdentifierType,
                    name: identifierToken(rawType),
                  },
                },
              ],
            },
          },
          memberBlock: {
            kind: NodeKind.MemberBlock,
            members: {
              kind: NodeKind.MemberBlockItemList,
              items: node.children.map((literal): MemberBlockItemNode => {
                return {
                  kind: NodeKind.MemberBlockItem,
                  decl: {
                    kind: NodeKind.EnumCaseDecl,
                    jsDoc: literal.jsDoc,
                    attributes: deprecatedDocToAttribute(literal.jsDoc),
                    elements: {
                      kind: NodeKind.EnumCaseElementList,
                      elements: [
                        {
                          kind: NodeKind.EnumCaseElement,
                          name: identifierToken(`_${literal.value}`),
                          rawValue: {
                            kind: NodeKind.InitializerClause,
                            value: {
                              kind: isInt
                                ? NodeKind.IntegerLiteralExpr
                                : NodeKind.FloatLiteralExpr,
                              value: literal.value as number,
                            },
                          },
                        },
                      ],
                    },
                  },
                }
              }),
            },
          },
        })
      }

      throw new Error("Cannot create enumeration declaration from union node")
    case SourceAst.NodeKind.Literal:
      if (typeof node.value === "string" || typeof node.value === "number") {
        return childNodeToDeclNode(
          name,
          jsDoc,
          typeParameters,
          {
            kind: SourceAst.NodeKind.Union,
            jsDoc: node.jsDoc,
            fileName: node.fileName,
            children: [node],
          },
          options
        )
      }

      throw new Error("Cannot create enumeration declaration from literal node")
    default:
      return assertExhaustive(node)
  }
}

export const statementNodeToDeclNode = (
  node: SourceAst.StatementNode,
  options: TransformOptions
): DeclNode | undefined => {
  if (ignoreNode(node, IGNORE_ENV)) {
    return undefined
  }

  switch (node.kind) {
    case SourceAst.NodeKind.Group:
      return cleanupUndefinedKeys<EnumDeclNode>({
        kind: NodeKind.EnumDecl,
        jsDoc: node.jsDoc,
        attributes: deprecatedDocToAttribute(node.jsDoc),
        modifiers: accessControlModifier(options),
        name: identifierToken(forcePascal(node.name, options)),
        memberBlock: {
          kind: NodeKind.MemberBlock,
          members: {
            kind: NodeKind.MemberBlockItemList,
            items: node.children
              .map((child) => statementNodeToDeclNode(child, options))
              .filter(isNotNullish)
              .map((decl) => ({
                kind: NodeKind.MemberBlockItem,
                decl,
              })),
          },
        },
      })
    case SourceAst.NodeKind.Enumeration:
      return cleanupUndefinedKeys<EnumDeclNode>({
        kind: NodeKind.EnumDecl,
        jsDoc: node.jsDoc,
        attributes: deprecatedDocToAttribute(node.jsDoc),
        modifiers: accessControlModifier(options),
        name: identifierToken(forcePascal(node.name, options)),
        inheritanceClause: {
          kind: NodeKind.InheritanceClause,
          inheritedTypes: {
            kind: NodeKind.InheritanceTypeList,
            types: node.children.every(
              (child) => typeof child.value === "string"
            )
              ? [
                  {
                    kind: NodeKind.InheritanceType,
                    type: {
                      kind: NodeKind.IdentifierType,
                      name: identifierToken("String"),
                    },
                  },
                ]
              : node.children.every(
                  (child) =>
                    typeof child.value === "number" &&
                    Number.isInteger(child.value)
                )
              ? [
                  {
                    kind: NodeKind.InheritanceType,
                    type: {
                      kind: NodeKind.IdentifierType,
                      name: identifierToken("Int"),
                    },
                  },
                ]
              : [
                  {
                    kind: NodeKind.InheritanceType,
                    type: {
                      kind: NodeKind.IdentifierType,
                      name: identifierToken("Double"),
                    },
                  },
                ],
          },
        },
        memberBlock: {
          kind: NodeKind.MemberBlock,
          members: {
            kind: NodeKind.MemberBlockItemList,
            items: node.children.map((member) => ({
              kind: NodeKind.MemberBlockItem,
              decl: cleanupUndefinedKeys<EnumCaseDeclNode>({
                kind: NodeKind.EnumCaseDecl,
                jsDoc: member.jsDoc,
                attributes: deprecatedDocToAttribute(member.jsDoc),
                elements: {
                  kind: NodeKind.EnumCaseElementList,
                  elements: [
                    {
                      kind: NodeKind.EnumCaseElement,
                      name: identifierToken(forceCamel(member.name, options)),
                      rawValue: {
                        kind: NodeKind.InitializerClause,
                        value:
                          typeof member.value === "string"
                            ? {
                                kind: NodeKind.StringLiteralExpr,
                                value: member.value,
                              }
                            : Number.isInteger(member.value)
                            ? {
                                kind: NodeKind.IntegerLiteralExpr,
                                value: member.value,
                              }
                            : {
                                kind: NodeKind.FloatLiteralExpr,
                                value: member.value,
                              },
                      },
                    },
                  ],
                },
              }),
            })),
          },
        },
      })
    case SourceAst.NodeKind.TypeDefinition:
      return childNodeToDeclNode(
        node.name,
        node.jsDoc,
        node.typeParameters,
        node.definition,
        options
      )
    case SourceAst.NodeKind.ExportAssignment:
      return childNodeToDeclNode(
        node.name,
        node.jsDoc,
        undefined,
        node.expression,
        options
      )
    default:
      return assertExhaustive(node)
  }
}

export const transformAst = (
  node: SourceAst.RootNode,
  options: TransformOptions = {}
): DeclNode[] | undefined =>
  ignoreNode(node, IGNORE_ENV)
    ? undefined
    : node.children
        .map((child) => statementNodeToDeclNode(child, options))
        .filter(isNotNullish)

export type TransformOptions = {
  enumerationSynthesizationDiscriminatorKey?: string
  forceConstantStructMembers?: boolean
  defaultPublic?: boolean
  convertIdentifiersToNamingConvention?: boolean
  generateStructInitializers?: boolean
}
