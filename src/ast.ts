import * as ts from "typescript"

export namespace JSDoc {
  const tagValueTypes = {
    main: "string",
    title: "string",
    minimum: "number",
    maximum: "number",
    minProperties: "integer",
    maxProperties: "integer",
    patternProperties: "string",
    minLength: "integer",
    maxLength: "integer",
    minItems: "integer",
    maxItems: "integer",
    integer: "boolean",
    uniqueItems: "boolean",
    markdown: "boolean",
    pattern: "string",
    format: "string",
  } as const

  export type TagValueTypes = typeof tagValueTypes

  type TypeStringType = {
    number: number
    integer: number
    boolean: boolean
    string: string
  }

  type TagValueActualTypes = {
    [K in keyof TagValueTypes]?: TypeStringType[TagValueTypes[K]]
  }

  export type Type = {
    comment?: string
    tags: TagValueActualTypes
  }

  const commentToString = (comment: string | ts.NodeArray<ts.JSDocComment> | undefined) =>
    ts.getTextOfJSDocComment(comment)
      ?.replace(/\r\n(?:\r\n)+/g, "\n\n")
      .replace(/\r\n/g, " ")

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

  const jsDocToCustom = (jsDoc: ts.JSDoc | undefined): Type | undefined => {
    if (jsDoc) {
      const comment = commentToString(jsDoc.comment)
      const tags = jsDoc.tags?.map(tagToCustom) ?? []

      if (comment !== undefined || tags.length > 0) {
        return { comment, tags: Object.fromEntries(tags) }
      }
    }
  }

  export const ofNode = (node: ts.Node): Type | undefined =>
    jsDocToCustom(node.getChildren().filter(ts.isJSDoc).slice(-1)[0])

  export const ofModule = (file: ts.SourceFile): Type | undefined => {
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

export enum TokenKind {
  String,
  Number,
  Boolean,
}

export type GroupNode = {
  kind: NodeKind.Group
  jsDoc?: JSDoc.Type
  elements: {
    [identifier: string]: ChildNode
  }
}

export type RecordNode = {
  kind: NodeKind.Record
  jsDoc?: JSDoc.Type
  elements: {
    [identifier: string]: {
      jsDoc?: JSDoc.Type
      required: boolean
      value: ChildNode
    }
  }
}

export type DictionaryNode = {
  kind: NodeKind.Dictionary
  jsDoc?: JSDoc.Type
  elements: ChildNode
  pattern?: string
}

export type TokenNode = {
  kind: NodeKind.Token
  token: TokenKind
  jsDoc?: JSDoc.Type
}

export type ReferenceNode = {
  kind: NodeKind.Reference
  jsDoc?: JSDoc.Type
  name: string
  externalFilePath?: string
}

export type EnumerationNode = {
  kind: NodeKind.Enumeration
  jsDoc?: JSDoc.Type
  cases: {
    jsDoc?: JSDoc.Type
    name: string
    value: string | number
  }[]
}

export type ArrayNode = {
  kind: NodeKind.Array
  jsDoc?: JSDoc.Type
  elements: ChildNode
}

export type UnionNode = {
  kind: NodeKind.Union
  jsDoc?: JSDoc.Type
  cases: ChildNode[]
}

export type LiteralNode = {
  kind: NodeKind.Literal
  jsDoc?: JSDoc.Type
  value: string | number
}

export type TupleNode = {
  kind: NodeKind.Tuple
  jsDoc?: JSDoc.Type
  elements: ChildNode[]
}

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

export type RootNode = {
  kind: NodeKind.Main
  jsDoc?: JSDoc.Type
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

const isStatement = (node: ts.Node): node is Statement =>
  ts.isInterfaceDeclaration(node)
  || ts.isTypeAliasDeclaration(node)
  || ts.isEnumDeclaration(node)
  || ts.isModuleDeclaration(node)

const statementsToStatementDictionary = (node: ts.SourceFile | ts.ModuleBlock) =>
  Object.fromEntries(
    node.statements
      .filter(isStatement)
      .map(statement => [
        statementIdentifier(statement),
        nodeToAst(statement)
      ])
  )

const propertyNameToString = (propertyName: ts.PropertyName): string =>
  ts.isComputedPropertyName(propertyName)
    ? propertyName.expression.getText()
    : propertyName.text

const nodeToAst = (node: ts.Node): ChildNode => {
  if (ts.isModuleDeclaration(node)) {
    if (node.body && ts.isModuleBlock(node.body)) {
      return ({
        kind: NodeKind.Group,
        jsDoc: JSDoc.ofNode(node),
        elements: statementsToStatementDictionary(node.body)
      })
    }
    else {
      throw new Error("empty module declaration")
    }
  }
  else if (ts.isTypeAliasDeclaration(node)) {
    return nodeToAst(node.type)
  }
  else if (ts.isTypeLiteralNode(node) || ts.isInterfaceDeclaration(node)) {
    const jsDoc = JSDoc.ofNode(ts.isInterfaceDeclaration(node) ? node : node.parent)

    const firstMember = node.members[0]

    if (node.members.length === 1 && firstMember && ts.isIndexSignatureDeclaration(firstMember)) {
      return {
        kind: NodeKind.Dictionary,
        jsDoc,
        elements: nodeToAst(firstMember.type),
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
                    required: member.questionToken === undefined,
                    value: nodeToAst(member.type!)
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

    const name = ts.isIdentifier(node.typeName)
      ? node.typeName.escapedText.toString()
      : node.typeName.right.escapedText.toString()

    const importNodes = node.getSourceFile().statements.filter(ts.isImportDeclaration)

    const matchingImportNode = importNodes.find(importNode => {
      const namedBindings = importNode.importClause?.namedBindings

      if (namedBindings && ts.isNamedImports(namedBindings)) {
        return namedBindings.elements.some(
          namedBinding => namedBinding.name.escapedText === name
        )
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
      externalFilePath
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
      elements: nodeToAst(node.elementType)
    }
  }
  else if (ts.isUnionTypeNode(node)) {
    const jsDoc = JSDoc.ofNode(node.parent)

    return {
      kind: NodeKind.Union,
      jsDoc,
      cases: node.types.map(nodeToAst)
    }
  }
  else if (ts.isLiteralTypeNode(node)) {
    const jsDoc = JSDoc.ofNode(node.parent)

    if (ts.isStringLiteral(node.literal)) {
      return {
        kind: NodeKind.Literal,
        jsDoc,
        value: node.literal.text
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
      elements: node.elements.map(nodeToAst)
    }
  }
  else {
    throw new Error(`node of type "${ts.SyntaxKind[node.kind]}" is not supported`)
  }
}

export const fileToAst = (file: ts.SourceFile): RootNode => {
  const jsDoc = JSDoc.ofModule(file)

  return {
    kind: NodeKind.Main,
    jsDoc,
    elements: statementsToStatementDictionary(file)
  }
}
