import { dirname, extname, format, join, parse, relative, resolve, sep } from "path"
import ts from "typescript"
import { Doc, parseModuleDoc, parseNodeDoc } from "./doc.js"

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
  TypeArgument,
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
  jsDoc?: Doc

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
  jsDoc?: Doc

  /**
   * All properties, keyed by the property name.
   */
  elements: {
    [identifier: string]: {
      jsDoc?: Doc

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

export const isRecordNode = (node: ChildNode): node is RecordNode => node.kind === NodeKind.Record

/**
 * An object with a variable set of keys with the same value type. The keys may
 * be restricted to match a certain regular expression.
 */
export type DictionaryNode = {
  kind: NodeKind.Dictionary
  jsDoc?: Doc

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
  jsDoc?: Doc

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
  jsDoc?: Doc

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
  jsDoc?: Doc

  /**
   * All possible cases.
   */
  cases: EnumerationCase[]
}

/**
 * A possible case from an enumeration.
 */
export type EnumerationCase = {
  jsDoc?: Doc

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
  jsDoc?: Doc

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
  jsDoc?: Doc

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
  jsDoc?: Doc

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
  jsDoc?: Doc

  /**
   * The types of the different elements of the tuple. Each node index
   * corresponds with the index in the tuple.
   */
  elements: ChildNode[]
}

type TypeArgumentNode = {
  kind: NodeKind.TypeArgument
  name: string
  referenced: ChildNode
  resolved?: ChildNode
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
 * A supported type node during AST creation.
 */
export type TempChildNode =
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
  | TypeArgumentNode

const resolveTempChildNode = (node: TempChildNode, resolve = false): ChildNode => {
  switch (node.kind) {
    case NodeKind.TypeArgument: return resolve ? node.resolved ?? node.referenced : node.referenced
    default:                    return node
  }
}

/**
 * The file root node.
 */
export type RootNode = {
  kind: NodeKind.Main
  jsDoc?: Doc

  /**
   * All top-level type declarations.
   */
  elements: {
    [identifier: string]: ChildNode
  }
}

const nameOfSyntaxKind = (node: ts.Node) => ts.SyntaxKind[node.kind]

type Statement =
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration
  | ts.ModuleDeclaration

const statementIdentifier = (statement: Statement) => statement.name.text

const hasNoOrDefaultedTypeParameters = (node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration) =>
  node.typeParameters === undefined || node.typeParameters.length === 0
  || node.typeParameters.every(typeParam => typeParam.default !== undefined)

const isStatement = (node: ts.Node): node is Statement =>
  (ts.isInterfaceDeclaration(node) && hasNoOrDefaultedTypeParameters(node))
  || (ts.isTypeAliasDeclaration(node) && hasNoOrDefaultedTypeParameters(node))
  || ts.isEnumDeclaration(node)
  || ts.isModuleDeclaration(node)

const statementsToStatementDictionary = (node: ts.SourceFile | ts.ModuleBlock, file: ts.SourceFile, checker: ts.TypeChecker, program: ts.Program, typeArguments: TypeArguments) =>
  Object.fromEntries(
    node.statements
      .filter(isStatement)
      .map(statement => [
        statementIdentifier(statement),
        resolveTempChildNode(nodeToAst(statement, file, checker, program, typeArguments))
      ])
  )

const isTypeDefinition = (node: ts.Node): node is ts.TypeAliasDeclaration | ts.InterfaceDeclaration =>
  ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)

const typeDefinitionsFromNode = (node: ts.SourceFile | ts.ModuleBlock) =>
  Object.fromEntries(
    node.statements
      .filter(isTypeDefinition)
      .map(statement => [
        statementIdentifier(statement),
        statement as ts.TypeAliasDeclaration | ts.InterfaceDeclaration
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

const entityNameToString = (entityName: ts.EntityName): string =>
  ts.isIdentifier(entityName)
    ? entityName.text
    : entityName.right.text

const resolveImportSpecifier = (node: ts.ImportSpecifier, program: ts.Program): ts.SourceFile | undefined => {
  const moduleSpecifier = (node.parent.parent.parent.moduleSpecifier as ts.StringLiteral).text

  const referencedFileName = format({
    ...parse(resolve(node.getSourceFile().fileName, "..", moduleSpecifier)),
    ext: ".ts",
    base: undefined
  })

  return program.getSourceFile(referencedFileName)
}

const identifierToImportDeclaration = (node: ts.Node, typeName?: string, namespaceName?: string): ts.ImportDeclaration | undefined =>
  node.getSourceFile().statements
    .filter(ts.isImportDeclaration)
    .find(importNode => {
      const namedBindings = importNode.importClause?.namedBindings

      if (namedBindings) {
        if (ts.isNamedImports(namedBindings) && typeName !== undefined) {
          return namedBindings.elements.some(
            namedBinding => namedBinding.name.text === typeName
          )
        }
        else if (ts.isNamespaceImport(namedBindings) && namespaceName !== undefined) {
          return namedBindings.name.text === namespaceName
        }
      }

      return false
    })

const resolveTypeArguments = <T extends ts.Node>(typeArgs: ts.NodeArray<T> | undefined, file: ts.SourceFile, checker: ts.TypeChecker, program: ts.Program, typeArguments: TypeArguments, getTypeNode: (arg: T) => ts.TypeNode, getName: (arg: T, index: number) => string): TypeArguments => {
  return typeArgs?.reduce<TypeArguments>((args, typeArg, index) => {
    const typeNode = getTypeNode(typeArg)

    if (typeNode === undefined) {
      return args
    }

    const referenced = nodeToAst(typeNode, file, checker, program, typeArguments)

    const argNode: TypeArgumentNode = referenced.kind === NodeKind.TypeArgument ? referenced : {
      kind: NodeKind.TypeArgument,
      name: getName(typeArg, index),
      referenced,
      resolved: (() => {
        if (ts.isTypeReferenceNode(typeNode)) {
          const type = checker.getTypeFromTypeNode(typeNode)
          const sourceFileOfType = type.getSymbol()?.declarations?.[0]?.getSourceFile()
          const statements = sourceFileOfType && typeDefinitionsFromNode(sourceFileOfType)
          const referencedTypeInArgument = statements?.[entityNameToString(typeNode.typeName)];

          if (referencedTypeInArgument) {
            return resolveTempChildNode(nodeToAst(referencedTypeInArgument, file, checker, program, typeArguments), true)
          }
        }
      })()
    }

    return {
      ...args,
      [argNode.name]: argNode
    }
  }, {}) ?? {}
}

const resolveTypeParameters = (typeParams: ts.NodeArray<ts.TypeParameterDeclaration> | undefined, file: ts.SourceFile, checker: ts.TypeChecker, program: ts.Program, typeArguments: TypeArguments): TypeArguments => {
  return resolveTypeArguments(typeParams, file, checker, program, typeArguments, typeParam => typeParam.default!, typeParam => typeParam.name.text)
}

type TypeArguments = {
  [name: string]: TypeArgumentNode
}

const nodeToAst = (node: ts.Node, file: ts.SourceFile, checker: ts.TypeChecker, program: ts.Program, typeArguments: TypeArguments, resolveReference = false): TempChildNode => {
  if (ts.isModuleDeclaration(node)) {
    if (node.body && ts.isModuleBlock(node.body)) {
      return ({
        kind: NodeKind.Group,
        jsDoc: parseNodeDoc(node),
        elements: statementsToStatementDictionary(node.body, file, checker, program, typeArguments)
      })
    }
    else {
      throw new Error("empty module declaration")
    }
  }
  else if (ts.isTypeAliasDeclaration(node)) {
    const newTypeArguments = resolveTypeParameters(node.typeParameters, file, checker, program, typeArguments)
    return nodeToAst(node.type, file, checker, program, { ...newTypeArguments, ...typeArguments}, resolveReference)
  }
  else if (ts.isTypeLiteralNode(node) || ts.isInterfaceDeclaration(node)) {
    const jsDoc = parseNodeDoc(ts.isInterfaceDeclaration(node) ? node : node.parent)

    const firstMember = node.members[0]

    if (node.members.length === 1 && firstMember && ts.isIndexSignatureDeclaration(firstMember)) {
      return {
        kind: NodeKind.Dictionary,
        jsDoc,
        elements: resolveTempChildNode(nodeToAst(firstMember.type, file, checker, program, typeArguments)),
        pattern: parseNodeDoc(firstMember)?.tags.patternProperties
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
                    jsDoc: parseNodeDoc(member),
                    isRequired: member.questionToken === undefined,
                    value: resolveTempChildNode(nodeToAst(member.type!, file, checker, program, typeArguments))
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
    const jsDoc = parseNodeDoc(node.parent)

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
        throw new Error(`node of type "${nameOfSyntaxKind(node)}" is not a type keyword`)
    }
  }
  else if (ts.isTypeReferenceNode(node)) {
    const jsDoc = parseNodeDoc(node.parent)

    const symbol = checker.getSymbolAtLocation(node.typeName)

    if (node.typeArguments && node.typeArguments.length > 0) {
      const referencedType = symbol?.declarations?.[0]!

      const typeParameters = (() => {
        if (ts.isTypeAliasDeclaration(referencedType)) {
          return referencedType.typeParameters ?? []
        }
        else if (ts.isImportSpecifier(referencedType)) {
          const referencedFile = resolveImportSpecifier(referencedType, program)
          const statements = referencedFile ? typeDefinitionsFromNode(referencedFile) : {}
          return statements[referencedType.name.text]?.typeParameters ?? []
        }
        else {
          throw new Error(`resolving type parameters from referenced node of type "${nameOfSyntaxKind(referencedType)}" is currently not supported`)
        }
      })()

      const newTypeArguments = resolveTypeArguments(node.typeArguments, file, checker, program, typeArguments, typeArg => typeArg, (_, index) => typeParameters[index]?.name.text ?? "")

      if (typeParameters.length !== Object.keys(newTypeArguments).length) {
        throw new Error(`resolving type parameters failed due to a different number of arguments provided`)
      }

      return nodeToAst(referencedType, file, checker, program, newTypeArguments)
    }
    else {
      const name = ts.isIdentifier(node.typeName)
        ? node.typeName.escapedText.toString()
        // node.typeName.left is recursive module name,
        // such as "Test.Collection" in "Test.Collection.Plain", inside left the left is "Test"
        : node.typeName.right.escapedText.toString()

      const parentGroup = symbol ? traverseAbsoluteParentModules(symbol, checker) : undefined

      const outerMostReference =
        parentGroup
        ? outerMostGroupName(parentGroup)
        : name

      const alternativeOuterMostReference =
        ts.isQualifiedName(node.typeName)
        ? outerMostQualifiedName(node.typeName)
        : undefined

      if (
        parentGroup === undefined
        && alternativeOuterMostReference === undefined
        && name in typeArguments
      ) {
        return {
          kind: NodeKind.TypeArgument,
          name,
          referenced: typeArguments[name]!.referenced,
          resolved: typeArguments[name]!.resolved,
        }
      }
      else if (resolveReference) {
        const type = checker.getTypeFromTypeNode(node)
        const sourceFileOfType = (type.getSymbol() ?? type.aliasSymbol)?.declarations?.[0]?.getSourceFile()
        const statements = sourceFileOfType && typeDefinitionsFromNode(sourceFileOfType)
        const referencedTypeInArgument = statements?.[entityNameToString(node.typeName)];

        if (referencedTypeInArgument) {
          return nodeToAst(referencedTypeInArgument, file, checker, program, typeArguments, true)
        }
      }

      const emptyPathToUndefined = (path: string | undefined) => path ? path : undefined
      const removeExtension = (path: string | undefined) => path?.slice(0, -extname(path).length)
      const appendCurrentDir = (path: string | undefined) => path?.[0] === "." ? path : `.${sep}${path}`
      const getPathFromImportDeclaration = (imp: ts.ImportDeclaration | undefined) =>
        imp?.moduleSpecifier.getText().replace(/^(["'])(.+)\1$/, "$2")

      const associatedImportNodeForType = identifierToImportDeclaration(node, outerMostReference, alternativeOuterMostReference)
      const externalFilePathFromImport = emptyPathToUndefined(getPathFromImportDeclaration(associatedImportNodeForType))

      const originFileName = file.fileName
      const currentFileName = node.getSourceFile().fileName

      const getPathToReferencedTypeFromOriginFile = () => {
        const fileDifference = relative(dirname(file.fileName), currentFileName)

        const joinedReferencedTypeFileViaImport = externalFilePathFromImport === undefined
          ? fileDifference
          : join(fileDifference, "..", externalFilePathFromImport.split("/").join(sep))

        return emptyPathToUndefined(appendCurrentDir(removeExtension(joinedReferencedTypeFileViaImport)))
      }

      const externalFilePathFromFilePaths =
        originFileName === currentFileName
          ? undefined
          : getPathToReferencedTypeFromOriginFile()

      return {
        kind: NodeKind.Reference,
        jsDoc,
        name,
        parentGroup,
        externalFilePath: externalFilePathFromFilePaths ?? removeExtension(externalFilePathFromImport),
      }
    }
  }
  else if (ts.isImportSpecifier(node)) {
    const referencedFile = resolveImportSpecifier(node, program)

    const referencedNode = referencedFile?.statements
      .find((statement): statement is ts.InterfaceDeclaration | ts.TypeAliasDeclaration =>
        (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement))
        && statementIdentifier(statement) === node.name.text)

    if (referencedNode) {
      return nodeToAst(referencedNode, file, checker, program, typeArguments)
    }
    else {
      throw new Error(`imported node is not a type`)
    }
  }
  else if (ts.isEnumDeclaration(node)) {
    const jsDoc = parseNodeDoc(node)

    return {
      kind: NodeKind.Enumeration,
      jsDoc,
      cases: node.members.map((member) => {
        if (member.initializer) {
          const jsDoc = parseNodeDoc(member)

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
    const jsDoc = parseNodeDoc(node.parent)

    return {
      kind: NodeKind.Array,
      jsDoc,
      elements: resolveTempChildNode(nodeToAst(node.elementType, file, checker, program, typeArguments))
    }
  }
  else if (ts.isUnionTypeNode(node)) {
    const jsDoc = parseNodeDoc(node.parent)

    return {
      kind: NodeKind.Union,
      jsDoc,
      cases: node.types.map(type => resolveTempChildNode(nodeToAst(type, file, checker, program, typeArguments)))
    }
  }
  else if (ts.isIntersectionTypeNode(node)) {
    const jsDoc = parseNodeDoc(node.parent)

    const intersectedNodes =
      node.types.map(childNode =>
        resolveTempChildNode(nodeToAst(childNode, file, checker, program, typeArguments, true), true)
      )

    if (intersectedNodes.every(isRecordNode)) {
      const [firstNode, ...otherNodes] = intersectedNodes
      const elements: RecordNode["elements"] = firstNode?.elements ?? {}

      otherNodes.forEach(otherNode =>
        Object.entries(otherNode.elements).forEach(([propertyName, propertyValue]) => {
          if (elements.hasOwnProperty(propertyName)) {
            throw new Error(`property ${propertyName} has been provided in multiple types of the intersection, which is currently not supported`)
          }
          else {
            elements[propertyName] = propertyValue
          }
        })
      )

      return {
        kind: NodeKind.Record,
        jsDoc,
        elements,
      }
    }
    else {
      throw new Error(`intersections are only supported for ${NodeKind[NodeKind.Record]}, but ${intersectedNodes.map(childNode => NodeKind[childNode.kind]).join(" and ")} were given`)
    }
  }
  else if (ts.isLiteralTypeNode(node)) {
    const jsDoc = parseNodeDoc(node.parent)

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
      throw new Error(`literal of type "${nameOfSyntaxKind(node.literal)}" is not supported`)
    }
  }
  else if (ts.isTupleTypeNode(node)) {
    const jsDoc = parseNodeDoc(node.parent)

    return {
      kind: NodeKind.Tuple,
      jsDoc,
      elements: node.elements.map(type => resolveTempChildNode(nodeToAst(type, file, checker, program, typeArguments)))
    }
  }
  else if (ts.isParenthesizedTypeNode(node)) {
    return nodeToAst(node.type, file, checker, program, typeArguments)
  }
  else {
    throw new Error(`node of type "${nameOfSyntaxKind(node)}" is not supported`)
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
export const fileToAst = (file: ts.SourceFile, checker: ts.TypeChecker, program: ts.Program): RootNode => {
  const jsDoc = parseModuleDoc(file)

  return {
    kind: NodeKind.Main,
    jsDoc,
    elements: statementsToStatementDictionary(file, file, checker, program, {})
  }
}
