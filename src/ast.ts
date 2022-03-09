import { EOL } from "os"
import ts from "typescript"

export namespace JSDoc {
  const tagValueTypes = {
    main: "string",
    title: "string",
    // string
    minLength: "integer",
    maxLength: "integer",
    pattern: "string",
    format: "string",
    markdown: "boolean",
    // numeric
    integer: "boolean",
    minimum: "number",
    maximum: "number",
    multipleOf: "number",
    exclusiveMinimum: "number",
    exclusiveMaximum: "number",
    // object
    minProperties: "integer",
    maxProperties: "integer",
    patternProperties: "string",
    // array
    minItems: "integer",
    maxItems: "integer",
    uniqueItems: "boolean",
  } as const

  /**
   * A dictionary from all supported tag names to their value types.
   */
  export type TagValueTypes = typeof tagValueTypes

  type TypeStringType = {
    number: number
    integer: number
    boolean: boolean
    string: string
  }

  type TagValueActualTypes = {
    -readonly [K in keyof TagValueTypes]?: TypeStringType[TagValueTypes[K]]
  }

  /**
   * The parsed JSDoc annotations for a node.
   */
  export type T = {
    /**
     * The initial description text.
     */
    comment?: string

    /**
     * A dictionary of supported tags (`@tag`) with parsed values, if present.
     */
    tags: TagValueActualTypes
  }

  const commentToString = (comment: string | ts.NodeArray<ts.JSDocComment> | undefined) =>
    ts.getTextOfJSDocComment(comment)?.replaceAll(EOL, "\n")

  const parseTagComment = <K extends keyof TagValueActualTypes>(name: K, comment: string | undefined): TagValueActualTypes[K] => {
    const type = tagValueTypes[name]

    if (type === "boolean") {
      return (comment === "true" || !comment) as TagValueActualTypes[K]
    }
    else if (type === "number") {
      return (comment === undefined ? 0 : Number.parseFloat(comment)) as TagValueActualTypes[K]
    }
    else if (type === "integer") {
      return (comment === undefined ? 0 : Number.parseInt(comment)) as TagValueActualTypes[K]
    }
    else {
      return (comment ?? "") as TagValueActualTypes[K]
    }
  }

  const tagToCustom = (tag: ts.JSDocTag): [keyof TagValueActualTypes, TagValueActualTypes[keyof TagValueActualTypes]] => [
    tag.tagName.text as keyof TagValueActualTypes,
    parseTagComment(tag.tagName.text as keyof TagValueActualTypes, commentToString(tag.comment))
  ]

  const jsDocToCustom = (jsDoc: ts.JSDoc | undefined): T | undefined => {
    if (jsDoc) {
      const comment = commentToString(jsDoc.comment)
      const tags = jsDoc.tags?.map(tagToCustom) ?? []

      if (comment !== undefined || tags.length > 0) {
        return { comment, tags: Object.fromEntries(tags) }
      }
    }
  }

  /**
   * Get the JSDoc from a node, if present.
   *
   * @param node - The node to get the JSDoc from.
   * @returns The parsed JSDoc, if any.
   */
  export const ofNode = (node: ts.Node): T | undefined =>
    jsDocToCustom(node.getChildren().filter(ts.isJSDoc).slice(-1)[0])

  /**
   * Get the JSDoc from the file/module.
   *
   * @param file - The file/module to get the JSDoc from.
   * @returns The parsed JSDoc, if any.
   */
  export const ofModule = (file: ts.SourceFile): T | undefined => {
    const firstNode = file.statements[0]

    if (firstNode) {
      if (ts.isImportDeclaration(firstNode)) {
        return JSDoc.ofNode(firstNode)
      }
      else {
        const jsDocs = firstNode.getChildren().filter(ts.isJSDoc)

        return jsDocs.length > 1 ? jsDocToCustom(jsDocs[0]) : undefined
      }
    }
  }
}

/**
 * The possible discriminator values to differenciate the different nodes.
 */
export enum NodeKind {
  Main,
  Group,
  Record,
  Dictionary,
  Token,
  Reference,
  Enumeration,
  Array,
  Union,
  Literal,
  Tuple,
}

/**
 * The possible discriminator values to differenciate the different tokens.
 */
export enum TokenKind {
  String,
  Number,
  Boolean,
}

/**
 * A grouped/namespaced set of declarations.
 */
export type GroupNode = {
  kind: NodeKind.Group
  jsDoc?: JSDoc.T

  /**
   * All elements within, keyed by their identifier.
   */
  elements: {
    [identifier: string]: ChildNode
  }
}

/**
 * An object with a fixed set of keys, which may have different value types.
 */
export type RecordNode = {
  kind: NodeKind.Record
  jsDoc?: JSDoc.T

  /**
   * All properties, keyed by the property name.
   */
  elements: {
    [identifier: string]: {
      jsDoc?: JSDoc.T

      /**
       * Is the property required?
       */
      isRequired: boolean

      /**
       * The property value.
       */
      value: ChildNode
    }
  }
}

/**
 * An object with a variable set of keys with the same value type. The keys may
 * be restricted to match a certain regular expression.
 */
export type DictionaryNode = {
  kind: NodeKind.Dictionary
  jsDoc?: JSDoc.T

  /**
   * The value type at all defined keys.
   */
  elements: ChildNode

  /**
   * An optional pattern in regular expression syntax all keys must match.
   */
  pattern?: string
}

/**
 * A primitive type.
 */
export type TokenNode = {
  kind: NodeKind.Token
  jsDoc?: JSDoc.T

  /**
   * The specific primitive type.
   */
  token: TokenKind
}

export type ParentGroup = {
  name: string
  parentGroup?: ParentGroup
}

/**
 * Resolves a single-linked list of parent nodes into an array, where the
 * resulting array is sorted right-to-left.
 */
export const parentGroupToArray = (group: ParentGroup | undefined): string[] =>
  group === undefined ? [] : [...parentGroupToArray(group.parentGroup), group.name]

/**
 * A reference to another type.
 */
export type ReferenceNode = {
  kind: NodeKind.Reference
  jsDoc?: JSDoc.T

  /**
   * The name of the referenced type.
   */
  name: string

  /**
   * The groups or namespaces the type is in, if any. The linked list starts at
   * the innermost group or namespace; the last element is the outermost group
   * or namespace.
   */
  parentGroup?: ParentGroup

  /**
   * The relative path to the file where the type is specified. It is only
   * defined if it is different from the file it is referenced from.
   */
  externalFilePath?: string
}

/**
 * A fixed set of possible string or numeric values.
 */
export type EnumerationNode = {
  kind: NodeKind.Enumeration
  jsDoc?: JSDoc.T

  /**
   * All possible cases.
   */
  cases: EnumerationCase[]
}

/**
 * A possible case from an enumeration.
 */
export type EnumerationCase = {
  jsDoc?: JSDoc.T

  /**
   * The case name.
   */
  name: string

  /**
   * The value the case represents.
   */
  value: string | number
}

/**
 * An array of elements of the same type.
 */
export type ArrayNode = {
  kind: NodeKind.Array
  jsDoc?: JSDoc.T

  /**
   * The type of all elements.
   */
  elements: ChildNode
}

/**
 * A set of possible types.
 */
export type UnionNode = {
  kind: NodeKind.Union
  jsDoc?: JSDoc.T

  /**
   * The list of all possible types.
   */
  cases: ChildNode[]
}

/**
 * A constant value.
 */
export type LiteralNode = {
  kind: NodeKind.Literal
  jsDoc?: JSDoc.T

  /**
   * The constant value.
   */
  value: string | number | boolean
}

/**
 * A tuple of elements that may have different types.
 */
export type TupleNode = {
  kind: NodeKind.Tuple
  jsDoc?: JSDoc.T

  /**
   * The types of the different elements of the tuple. Each node index
   * corresponds with the index in the tuple.
   */
  elements: ChildNode[]
}

/**
 * A supported type node in a TypeScript file.
 */
export type ChildNode =
  | GroupNode
  | RecordNode
  | DictionaryNode
  | TokenNode
  | ReferenceNode
  | EnumerationNode
  | ArrayNode
  | UnionNode
  | LiteralNode
  | TupleNode

/**
 * The file root node.
 */
export type RootNode = {
  kind: NodeKind.Main
  jsDoc?: JSDoc.T

  /**
   * All top-level type declarations.
   */
  elements: {
    [identifier: string]: ChildNode
  }
}

type Statement =
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration
  | ts.ModuleDeclaration

const statementIdentifier = (statement: Statement) => statement.name.text

const hasNoTypeParameters = (node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration) =>
  node.typeParameters === undefined || node.typeParameters.length === 0

const isStatement = (node: ts.Node): node is Statement =>
  (ts.isInterfaceDeclaration(node) && hasNoTypeParameters(node))
  || (ts.isTypeAliasDeclaration(node) && hasNoTypeParameters(node))
  || ts.isEnumDeclaration(node)
  || ts.isModuleDeclaration(node)

const statementsToStatementDictionary = (node: ts.SourceFile | ts.ModuleBlock, checker: ts.TypeChecker, typeArguments: { [name: string]: ChildNode }) =>
  Object.fromEntries(
    node.statements
      .filter(isStatement)
      .map(statement => [
        statementIdentifier(statement),
        nodeToAst(statement, checker, typeArguments)
      ])
  )

const parentModuleSymbol = (symbol: ts.Symbol, checker: ts.TypeChecker) => {
  const block = symbol?.declarations?.[0]?.parent
  return block && ts.isModuleBlock(block)
    ? checker.getSymbolAtLocation(block.parent.name)
    : undefined
}

const traverseAbsoluteParentModules = (currentModule: ts.Symbol, checker: ts.TypeChecker): ParentGroup | undefined => {
  const parentModule = parentModuleSymbol(currentModule, checker)

  if (parentModule) {
    return { name: parentModule.name, parentGroup: traverseAbsoluteParentModules(parentModule, checker)}
  }
  else {
    return undefined
  }
}

const outerMostGroupName = (group: ParentGroup): string => {
  if (group.parentGroup) {
    return outerMostGroupName(group.parentGroup)
  }
  else {
    return group.name
  }
}

const outerMostQualifiedName = (name: ts.QualifiedName): string => {
  if (ts.isQualifiedName(name.left)) {
    return outerMostQualifiedName(name.left)
  }
  else {
    return name.left.text
  }
}

const propertyNameToString = (propertyName: ts.PropertyName): string =>
  ts.isComputedPropertyName(propertyName)
    ? propertyName.expression.getText()
    : propertyName.text

const nodeToAst = (node: ts.Node, checker: ts.TypeChecker, typeArguments: { [name: string]: ChildNode }): ChildNode => {
  if (ts.isModuleDeclaration(node)) {
    if (node.body && ts.isModuleBlock(node.body)) {
      return ({
        kind: NodeKind.Group,
        jsDoc: JSDoc.ofNode(node),
        elements: statementsToStatementDictionary(node.body, checker, typeArguments)
      })
    }
    else {
      throw new Error("empty module declaration")
    }
  }
  else if (ts.isTypeAliasDeclaration(node)) {
    return nodeToAst(node.type, checker, typeArguments)
  }
  else if (ts.isTypeLiteralNode(node) || ts.isInterfaceDeclaration(node)) {
    const jsDoc = JSDoc.ofNode(ts.isInterfaceDeclaration(node) ? node : node.parent)

    const firstMember = node.members[0]

    if (node.members.length === 1 && firstMember && ts.isIndexSignatureDeclaration(firstMember)) {
      return {
        kind: NodeKind.Dictionary,
        jsDoc,
        elements: nodeToAst(firstMember.type, checker, typeArguments),
        pattern: JSDoc.ofNode(firstMember)?.tags.patternProperties
      }
    }
    else if (node.members.every(ts.isPropertySignature)) {
      return {
        kind: NodeKind.Record,
        jsDoc,
        elements: Object.fromEntries(
          (node.members as readonly ts.PropertySignature[]).flatMap(
            member => member.type
              ? [
                [
                  propertyNameToString(member.name),
                  {
                    jsDoc: JSDoc.ofNode(member),
                    isRequired: member.questionToken === undefined,
                    value: nodeToAst(member.type!, checker, typeArguments)
                  }
                ]
              ]
              : []
          )
        )
      }
    }
    else {
      throw new Error("mixing index signatures and fixed properties is not supported")
    }
  }
  else if (ts.isToken(node)) {
    const jsDoc = JSDoc.ofNode(node.parent)

    switch (node.kind) {
      case ts.SyntaxKind.NumberKeyword: {
        return {
          kind: NodeKind.Token,
          token: TokenKind.Number,
          jsDoc
        }
      }

      case ts.SyntaxKind.StringKeyword: {
        return {
          kind: NodeKind.Token,
          token: TokenKind.String,
          jsDoc
        }
      }

      case ts.SyntaxKind.BooleanKeyword: {
        return {
          kind: NodeKind.Token,
          token: TokenKind.Boolean,
          jsDoc
        }
      }

      default:
        throw new Error(`node of type "${ts.SyntaxKind[node.kind]}" is not a type keyword`)
    }
  }
  else if (ts.isTypeReferenceNode(node)) {
    const jsDoc = JSDoc.ofNode(node.parent)

    const symbol = checker.getSymbolAtLocation(node.typeName)

    if (node.typeArguments && node.typeArguments.length > 0) {
      if (ts.isTypeAliasDeclaration(node.parent)) {
        const nodeWithTypeParameters = symbol?.declarations?.[0]!

        const typeParameters = (() => {
          if (ts.isTypeAliasDeclaration(nodeWithTypeParameters)) {
            return nodeWithTypeParameters.typeParameters ?? []
          }
          else {
            throw new Error(`resolving type parameters from referenced node of type "${ts.SyntaxKind[nodeWithTypeParameters.kind]}" is currently not supported`)
          }
        })()

        const newTypeArguments = node.typeArguments.map(
          typeNode => nodeToAst(typeNode, checker, typeArguments)
        )

        if (typeParameters.length !== newTypeArguments.length) {
          throw new Error(`resolving type parameters failed due to a different number of arguments provided`)
        }

        const newTypeArgumentsMap = Object.fromEntries(
          typeParameters.map(
            (key, index) => [key.name.text, newTypeArguments[index]!]
          )
        )

        return nodeToAst(nodeWithTypeParameters, checker, newTypeArgumentsMap)
      }
      else {
        throw new Error(`resolving type parameters from parent node of type "${ts.SyntaxKind[node.parent.kind]}" is currently not supported`)
      }
    }
    else {
      const name = ts.isIdentifier(node.typeName)
        ? node.typeName.escapedText.toString()
        // node.typeName.left is recursive module name,
        // such as "Test.Collection" in "Test.Collection.Plain", inside left the left is "Test"
        : node.typeName.right.escapedText.toString()

      const parentGroup = symbol ? traverseAbsoluteParentModules(symbol, checker) : undefined

      if (parentGroup === undefined && name in typeArguments) {
        return typeArguments[name]!
      }

      const outerMostReference =
        parentGroup
        ? outerMostGroupName(parentGroup)
        : name

      const alternativeOuterMostReference =
        ts.isQualifiedName(node.typeName)
        ? outerMostQualifiedName(node.typeName)
        : undefined

      const importNodes = node.getSourceFile().statements.filter(ts.isImportDeclaration)

      const matchingImportNode = importNodes.find(importNode => {
        if (importNode.importClause?.namedBindings) {
          if (ts.isNamedImports(importNode.importClause.namedBindings)) {
            return importNode.importClause.namedBindings.elements.some(
              namedBinding => namedBinding.name.escapedText === outerMostReference
            )
          }
          else {
            return importNode.importClause.namedBindings.name.text === alternativeOuterMostReference
          }
        }
        else {
          return false
        }
      })

      const externalFilePath = matchingImportNode?.moduleSpecifier
        .getText()
        .replace(/^["'](.+)["']$/, "$1")

      return {
        kind: NodeKind.Reference,
        jsDoc,
        name,
        parentGroup,
        externalFilePath,
      }
    }
  }
  else if (ts.isEnumDeclaration(node)) {
    const jsDoc = JSDoc.ofNode(node)

    return {
      kind: NodeKind.Enumeration,
      jsDoc,
      cases: node.members.map((member) => {
        if (member.initializer) {
          const jsDoc = JSDoc.ofNode(member)

          if (ts.isStringLiteral(member.initializer)) {
            return {
              jsDoc,
              name: propertyNameToString(member.name),
              value: member.initializer.text
            }
          }
          else if (ts.isNumericLiteral(member.initializer)) {
            return {
              jsDoc,
              name: propertyNameToString(member.name),
              value: Number.parseFloat(member.initializer.text)
            }
          }
          else {
            throw new Error("enumeration members cannot have computed initializer")
          }
        }
        else {
          throw new Error("enumeration members are required to have an initializer")
        }
      })
    }
  }
  else if (ts.isArrayTypeNode(node)) {
    const jsDoc = JSDoc.ofNode(node.parent)

    return {
      kind: NodeKind.Array,
      jsDoc,
      elements: nodeToAst(node.elementType, checker, typeArguments)
    }
  }
  else if (ts.isUnionTypeNode(node)) {
    const jsDoc = JSDoc.ofNode(node.parent)

    return {
      kind: NodeKind.Union,
      jsDoc,
      cases: node.types.map(type => nodeToAst(type, checker, typeArguments))
    }
  }
  else if (ts.isLiteralTypeNode(node)) {
    const jsDoc = JSDoc.ofNode(node.parent)

    const isBooleanLiteral =
      (literal: ts.LiteralTypeNode["literal"]): literal is ts.BooleanLiteral =>
        literal.kind === ts.SyntaxKind.TrueKeyword || literal.kind === ts.SyntaxKind.FalseKeyword

    if (ts.isStringLiteral(node.literal)) {
      return {
        kind: NodeKind.Literal,
        jsDoc,
        value: node.literal.text,
      }
    }
    else if (ts.isNumericLiteral(node.literal)) {
      return {
        kind: NodeKind.Literal,
        jsDoc,
        value: Number.parseFloat(node.literal.text),
      }
    }
    else if (isBooleanLiteral(node.literal)) {
      return {
        kind: NodeKind.Literal,
        jsDoc,
        value: node.literal.kind === ts.SyntaxKind.TrueKeyword,
      }
    }
    else {
      throw new Error(`literal of type "${ts.SyntaxKind[node.literal.kind]}" is not supported`)
    }
  }
  else if (ts.isTupleTypeNode(node)) {
    const jsDoc = JSDoc.ofNode(node.parent)

    return {
      kind: NodeKind.Tuple,
      jsDoc,
      elements: node.elements.map(type => nodeToAst(type, checker, typeArguments))
    }
  }
  else {
    throw new Error(`node of type "${ts.SyntaxKind[node.kind]}" is not supported`)
  }
}

/**
 * Convert a file parsed by the TypeScript compiler to an instance of the custom
 * abstract syntax tree.
 *
 * @param file - The parsed file.
 * @param checker - An instance of the type checker associate with the current set of source files.
 * @returns The custom AST build from the parsed file.
 */
export const fileToAst = (file: ts.SourceFile, checker: ts.TypeChecker): RootNode => {
  const jsDoc = JSDoc.ofModule(file)

  return {
    kind: NodeKind.Main,
    jsDoc,
    elements: statementsToStatementDictionary(file, checker, {})
  }
}
