/**
 * The possible discriminator values to differenciate the different nodes.
 */
export enum NodeKind {
  Root,
  Group,
  Record,
  Member,
  Dictionary,
  Token,
  Reference,
  Enumeration,
  EnumerationCase,
  Array,
  Union,
  Literal,
  Tuple,
  ExportAssignment,
  TypeDefinition,
  TypeParameter,
  DefaultImport,
  NamedImport,
  NamespaceImport,
  Intersection,
}

/**
 * The parsed JSDoc annotations for a node.
 */
export type Doc = {
  /**
   * The initial description text.
   */
  comment?: string

  /**
   * A dictionary of supported tags (`@tag`) with parsed values, if present.
   */
  tags: DocTags
}

/**
 * A dictionary from all supported tag names to their JSON Schema data types.
 */
export type DocTagTypes = {
  // General
  main: "string"
  title: "string"
  default: "unknown"
  deprecated: "string"
  ignore: "string"

  // String
  minLength: "integer"
  maxLength: "integer"
  pattern: "string"
  format: "string"
  markdown: "boolean"

  // Numeric
  integer: "boolean"
  minimum: "number"
  maximum: "number"
  multipleOf: "number"
  exclusiveMinimum: "number"
  exclusiveMaximum: "number"

  // Object
  minProperties: "integer"
  maxProperties: "integer"
  patternProperties: "string"

  // Array
  minItems: "integer"
  maxItems: "integer"
  uniqueItems: "boolean"
}

/**
 * A dictionary from all supported data types in JSON Schema to their
 * corresponding TypeScript data types.
 */
type JSONSchemaTypeToTypeScriptType = {
  number: number
  integer: number
  boolean: boolean
  string: string
  unknown: unknown
}

/**
 * A dictionary from all supported tags to their values.
 */
export type DocTags = {
  -readonly [K in keyof DocTagTypes]?: JSONSchemaTypeToTypeScriptType[DocTagTypes[K]]
}

/**
 * An object with a fixed set of keys, which may have different value types.
 */
export type RecordNode = {
  kind: NodeKind.Record
  fileName: string
  jsDoc?: Doc
  members: MemberNode[]
}

export const isRecordNode = (node: Node): node is RecordNode =>
  node.kind === NodeKind.Record

export type MemberNode = {
  kind: NodeKind.Member
  fileName: string
  identifier: string

  jsDoc?: Doc

  /**
   * Is the property required?
   */
  isRequired: boolean

  /**
   * The property value.
   */
  value: ChildNode

  /**
   * Is the property read-only?
   */
  isReadOnly: boolean
}

/**
 * An object with a variable set of keys with the same value type. The keys may
 * be restricted to match a certain regular expression.
 */
export type DictionaryNode = {
  kind: NodeKind.Dictionary
  fileName: string
  jsDoc?: Doc

  /**
   * The value type at all defined keys.
   */
  children: ChildNode

  /**
   * An optional pattern in regular expression syntax all keys must match.
   */
  pattern?: string
}

export const isDictionaryNode = (node: Node): node is DictionaryNode =>
  node.kind === NodeKind.Dictionary

export type IntersectionNode = {
  kind: NodeKind.Intersection
  fileName: string
  jsDoc?: Doc

  /**
   * The types to intersect.
   */
  children: ChildNode[]
}

export const isIntersectionNode = (node: Node): node is IntersectionNode =>
  node.kind === NodeKind.Intersection

/**
 * The possible discriminator values to differenciate the different tokens.
 */
export enum TokenKind {
  String,
  Number,
  Boolean,
}

/**
 * A primitive type.
 */
export type TokenNode = {
  kind: NodeKind.Token
  fileName: string
  jsDoc?: Doc

  /**
   * The specific primitive type.
   */
  token: TokenKind
}

export const isTokenNode = (node: Node): node is TokenNode =>
  node.kind === NodeKind.Token

export type QualifiedName = {
  segment: string
  right?: QualifiedName
}

/**
 * A reference to another type.
 */
export type ReferenceNode = {
  kind: NodeKind.Reference
  fileName: string
  jsDoc?: Doc
  /**
   * Only used if type parameters are resolved, since this involves copying
   * nodes in different files.
   */
  resolvedFileName?: string
  name: QualifiedName
  typeArguments?: ChildNode[]
}

export const isReferenceNode = (node: Node): node is ReferenceNode =>
  node.kind === NodeKind.Reference

/**
 * An array of elements of the same type.
 */
export type ArrayNode = {
  kind: NodeKind.Array
  fileName: string
  jsDoc?: Doc

  /**
   * The type of all elements.
   */
  children: ChildNode
}

export const isArrayNode = (node: Node): node is ArrayNode =>
  node.kind === NodeKind.Array

/**
 * A set of possible types.
 */
export type UnionNode = {
  kind: NodeKind.Union
  fileName: string
  jsDoc?: Doc

  /**
   * The list of all possible types.
   */
  children: ChildNode[]
}

export const isUnionNode = (node: Node): node is UnionNode =>
  node.kind === NodeKind.Union

/**
 * A constant value.
 */
export type LiteralNode = {
  kind: NodeKind.Literal
  fileName: string
  jsDoc?: Doc

  /**
   * The constant value.
   */
  value: string | number | boolean
}

export const isLiteralNode = (node: Node): node is LiteralNode =>
  node.kind === NodeKind.Literal

/**
 * A tuple of elements that may have different types.
 */
export type TupleNode = {
  kind: NodeKind.Tuple
  fileName: string
  jsDoc?: Doc

  /**
   * The types of the different elements of the tuple. Each node index
   * corresponds with the index in the tuple.
   */
  children: ChildNode[]
}

export const isTupleNode = (node: Node): node is TupleNode =>
  node.kind === NodeKind.Tuple

/**
 * A fixed set of possible string or numeric values.
 */
export type EnumerationNode = {
  kind: NodeKind.Enumeration
  fileName: string
  name: string
  jsDoc?: Doc

  /**
   * All possible cases.
   */
  children: EnumerationCase[]
}

export const isEnumerationNode = (node: Node): node is EnumerationNode =>
  node.kind === NodeKind.Enumeration

/**
 * A possible case from an enumeration.
 */
export type EnumerationCase = {
  kind: NodeKind.EnumerationCase
  jsDoc?: Doc
  fileName: string

  /**
   * The case name.
   */
  name: string

  /**
   * The value the case represents.
   */
  value: string | number
}

export const isEnumerationCase = (node: Node): node is EnumerationCase =>
  node.kind === NodeKind.EnumerationCase

/**
 * A grouped/namespaced set of declarations.
 */
export type GroupNode = {
  kind: NodeKind.Group
  fileName: string
  name: string
  jsDoc?: Doc

  /**
   * All elements within, keyed by their identifier.
   */
  children: StatementNode[]
}

export const isGroupNode = (node: Node): node is GroupNode =>
  node.kind === NodeKind.Group

export type TypeParameterNode = {
  kind: NodeKind.TypeParameter
  name: string
  fileName: string
  constraint?: ChildNode
  default?: ChildNode
}

export const isTypeParameterNode = (node: Node): node is TypeParameterNode =>
  node.kind === NodeKind.TypeParameter

/**
 * A type definition (alias or interface).
 */
export type TypeDefinitionNode = {
  kind: NodeKind.TypeDefinition
  fileName: string
  name: string
  jsDoc?: Doc
  typeParameters?: TypeParameterNode[]
  definition: ChildNode
}

export const isTypeDefinitionNode = (node: Node): node is TypeDefinitionNode =>
  node.kind === NodeKind.TypeDefinition

export type ExportAssignmentNode = {
  kind: NodeKind.ExportAssignment
  fileName: string
  name: string
  jsDoc?: Doc
  expression: ChildNode
}

export const isExportAssignmentNode = (
  node: Node
): node is ExportAssignmentNode => node.kind === NodeKind.ExportAssignment

/**
 * A supported nested type node in a TypeScript file.
 */
export type ChildNode =
  | RecordNode
  | DictionaryNode
  | TokenNode
  | ReferenceNode
  | ArrayNode
  | UnionNode
  | LiteralNode
  | TupleNode
  | IntersectionNode

/**
 * A supported top-level node in a TypeScript file.
 */
export type StatementNode =
  | GroupNode
  | EnumerationNode
  | TypeDefinitionNode
  | ExportAssignmentNode

export type NamespaceImport = {
  kind: NodeKind.NamespaceImport
  name: string
  fileName: string
}

export const isNamespaceImport = (node: Node): node is NamespaceImport =>
  node.kind === NodeKind.NamespaceImport

export type NamedImport = {
  kind: NodeKind.NamedImport
  name: string
  alias?: string
  fileName: string
}

export const isNamedImport = (node: Node): node is NamedImport =>
  node.kind === NodeKind.NamedImport

export type DefaultImport = {
  kind: NodeKind.DefaultImport
  name: string
  fileName: string
}

export const isDefaultImport = (node: Node): node is DefaultImport =>
  node.kind === NodeKind.DefaultImport

export type ImportNode = NamespaceImport | NamedImport | DefaultImport

/**
 * The file root node.
 */
export type RootNode = {
  kind: NodeKind.Root
  jsDoc?: Doc
  fileName: string
  imports: ImportNode[]

  /**
   * All top-level type declarations.
   */
  children: StatementNode[]
}

export type ContentNode = RootNode | StatementNode | ChildNode

export type SupportNode = TypeParameterNode | EnumerationCase

export type Node = ContentNode | ImportNode | SupportNode
