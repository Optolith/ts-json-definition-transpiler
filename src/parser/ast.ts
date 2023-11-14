import { dirname, join } from "node:path/posix"
import ts from "typescript"
import {
  ChildNode,
  ImportNode,
  NodeKind,
  QualifiedName,
  RootNode,
  StatementNode,
  TokenKind,
  TypeParameterNode,
} from "../ast.js"
import { changeExtension } from "../utils/path.js"
import { parseModuleDoc, parseNodeDoc } from "./doc.js"

const mapChildRecursive = (
  node: ChildNode,
  visitor: (node: ChildNode) => ChildNode
): ChildNode => {
  switch (node.kind) {
    case NodeKind.Record:
      return visitor({
        ...node,
        children: Object.fromEntries(
          Object.entries(node.children).map(([key, property]) => [
            key,
            { ...property, value: mapChildRecursive(property.value, visitor) },
          ])
        ),
      })
    case NodeKind.Dictionary:
      return visitor({
        ...node,
        children: mapChildRecursive(node.children, visitor),
      })
    case NodeKind.Token:
      return visitor(node)
    case NodeKind.Reference:
      return visitor(node)
    case NodeKind.Array:
      return visitor({
        ...node,
        children: mapChildRecursive(node.children, visitor),
      })
    case NodeKind.Union:
      return visitor({
        ...node,
        children: node.children.map((child) =>
          mapChildRecursive(child, visitor)
        ),
      })
    case NodeKind.Literal:
      return visitor(node)
    case NodeKind.Tuple:
      return visitor({
        ...node,
        children: node.children.map((child) =>
          mapChildRecursive(child, visitor)
        ),
      })
    default:
      return node
  }
}

const mapStatementRecursive = (
  node: StatementNode,
  visitors: {
    statement: (node: StatementNode) => StatementNode
    child: (node: ChildNode) => ChildNode
  }
): StatementNode => {
  switch (node.kind) {
    case NodeKind.Group:
      return visitors.statement({
        ...node,
        children: node.children.map((child) =>
          mapStatementRecursive(child, visitors)
        ),
      })
    case NodeKind.Enumeration:
      return visitors.statement(node)
    case NodeKind.TypeDefinition:
      return visitors.statement({
        ...node,
        definition: mapChildRecursive(node.definition, visitors.child),
      })
    case NodeKind.ExportAssignment:
      return visitors.statement({
        ...node,
        expression: mapChildRecursive(node.expression, visitors.child),
      })
    default:
      return node
  }
}

export const mapRecursive = (
  node: RootNode,
  visitors: {
    root: (node: RootNode) => RootNode
    statement: (node: StatementNode) => StatementNode
    child: (node: ChildNode) => ChildNode
  }
): RootNode =>
  visitors.root({
    ...node,
    children: node.children.map((child) =>
      mapStatementRecursive(child, visitors)
    ),
  })

const nameOfSyntaxKind = (node: ts.Node) => ts.SyntaxKind[node.kind]

const entityNameToReferenceQualifiedName = (
  entityName: ts.EntityName,
  right?: QualifiedName
): QualifiedName => {
  if (ts.isIdentifier(entityName)) {
    return { segment: entityName.text, right }
  } else {
    return entityNameToReferenceQualifiedName(entityName.left, {
      segment: entityName.right.text,
      right,
    })
  }
}

const propertyNameToString = (propertyName: ts.PropertyName): string =>
  ts.isComputedPropertyName(propertyName)
    ? propertyName.expression.getText()
    : propertyName.text

const attachStructureTraceOnError = <T, Args extends any[] = []>(
  f: (...args: Args) => T,
  prependText: string,
  ...args: Args
): T => {
  try {
    return f(...args)
  } catch (error) {
    if (error instanceof Error) {
      error.message = `${prependText}: ${error.message}`
    }
    throw error
  }
}

const statementNodesToAst = (
  nodes: ts.NodeArray<ts.Statement>,
  file: ts.SourceFile,
  checker: ts.TypeChecker,
  program: ts.Program
): StatementNode[] =>
  nodes
    .map((node) => statementNodeToAst(node, file, checker, program))
    .filter((node): node is StatementNode => node !== undefined)

const statementNodeToAst = (
  node: ts.Statement,
  file: ts.SourceFile,
  checker: ts.TypeChecker,
  program: ts.Program
): StatementNode | undefined => {
  if (ts.isModuleDeclaration(node)) {
    if (node.body && ts.isModuleBlock(node.body)) {
      return attachStructureTraceOnError(
        (body): StatementNode => ({
          kind: NodeKind.Group,
          fileName: file.fileName,
          name: node.name.text,
          jsDoc: parseNodeDoc(node),
          children: statementNodesToAst(
            body.statements,
            file,
            checker,
            program
          ),
        }),
        `in group "${node.name.text}"`,
        node.body
      )
    } else {
      throw new Error("empty module declaration")
    }
  } else if (ts.isEnumDeclaration(node)) {
    const jsDoc = parseNodeDoc(node)

    return {
      kind: NodeKind.Enumeration,
      fileName: file.fileName,
      name: node.name.text,
      jsDoc,
      children: node.members.map((member) => {
        if (member.initializer) {
          const jsDoc = parseNodeDoc(member)

          if (ts.isStringLiteral(member.initializer)) {
            return {
              kind: NodeKind.EnumerationCase,
              fileName: file.fileName,
              jsDoc,
              name: propertyNameToString(member.name),
              value: member.initializer.text,
            }
          } else if (ts.isNumericLiteral(member.initializer)) {
            return {
              kind: NodeKind.EnumerationCase,
              fileName: file.fileName,
              jsDoc,
              name: propertyNameToString(member.name),
              value: Number.parseFloat(member.initializer.text),
            }
          } else {
            throw new Error(
              "enumeration members cannot have computed initializer"
            )
          }
        } else {
          throw new Error(
            "enumeration members are required to have an initializer"
          )
        }
      }),
    }
  } else if (ts.isInterfaceDeclaration(node)) {
    const jsDoc = parseNodeDoc(node)

    return attachStructureTraceOnError((): StatementNode => {
      const definition = nodeToAst(node, file, checker, program)

      if (definition === undefined) {
        throw new Error(
          `interface definition type "${nameOfSyntaxKind(
            node
          )}" is not supported`
        )
      }

      return {
        kind: NodeKind.TypeDefinition,
        fileName: file.fileName,
        jsDoc,
        name: node.name.text,
        typeParameters: node.typeParameters?.map(
          (typeParam): TypeParameterNode => ({
            kind: NodeKind.TypeParameter,
            name: typeParam.name.text,
            fileName: file.fileName,
            constraint: typeParam.constraint
              ? nodeToAst(typeParam.constraint, file, checker, program)
              : undefined,
            default: typeParam.default
              ? nodeToAst(typeParam.default, file, checker, program)
              : undefined,
          })
        ),
        definition,
      }
    }, `in interface "${node.name.text}"`)
  } else if (ts.isTypeAliasDeclaration(node)) {
    const jsDoc = parseNodeDoc(node)

    return attachStructureTraceOnError((): StatementNode => {
      const definition = nodeToAst(node.type, file, checker, program)

      if (definition === undefined) {
        throw new Error(
          `type alias definition type "${nameOfSyntaxKind(
            node.type
          )}" is not supported`
        )
      }

      return {
        kind: NodeKind.TypeDefinition,
        fileName: file.fileName,
        jsDoc,
        name: node.name.text,
        typeParameters: node.typeParameters?.map(
          (typeParam): TypeParameterNode => ({
            kind: NodeKind.TypeParameter,
            name: typeParam.name.text,
            fileName: file.fileName,
            constraint: typeParam.constraint
              ? nodeToAst(typeParam.constraint, file, checker, program)
              : undefined,
            default: typeParam.default
              ? nodeToAst(typeParam.default, file, checker, program)
              : undefined,
          })
        ),
        definition,
      }
    }, `in type alias "${node.name.text}"`)
  } else if (ts.isExportAssignment(node) && node.isExportEquals !== true) {
    const jsDoc = parseNodeDoc(node)

    return attachStructureTraceOnError((): StatementNode => {
      const expression = nodeToAst(node.expression, file, checker, program)

      if (expression === undefined) {
        throw new Error(
          `default export assignment type "${nameOfSyntaxKind(
            node.expression
          )}" is not supported`
        )
      }

      return {
        kind: NodeKind.ExportAssignment,
        fileName: file.fileName,
        jsDoc,
        name: "default",
        expression,
      }
    }, `in default export assignment`)
  } else if (ts.isImportDeclaration(node)) {
    // handle import declarations separately
    return undefined
  } else if (node.kind === ts.SyntaxKind.FirstStatement) {
    // ignore type configs in Optolith database schema
    return undefined
  } else {
    console.warn(
      `statement node of type "${nameOfSyntaxKind(node)}" is not supported`
    )
  }
}

const nodesToAst = (
  nodes: ts.NodeArray<ts.Node>,
  file: ts.SourceFile,
  checker: ts.TypeChecker,
  program: ts.Program
): ChildNode[] =>
  nodes
    .map((node) => nodeToAst(node, file, checker, program))
    .filter((node): node is ChildNode => node !== undefined)

const nodeToAst = (
  node: ts.Node,
  file: ts.SourceFile,
  checker: ts.TypeChecker,
  program: ts.Program
): ChildNode | undefined => {
  if (ts.isTypeLiteralNode(node) || ts.isInterfaceDeclaration(node)) {
    const jsDoc = parseNodeDoc(
      ts.isInterfaceDeclaration(node) ? node : node.parent
    )

    const firstMember = node.members[0]

    if (
      node.members.length === 1 &&
      firstMember &&
      ts.isIndexSignatureDeclaration(firstMember)
    ) {
      return attachStructureTraceOnError((): ChildNode => {
        const children = nodeToAst(firstMember.type, file, checker, program)

        if (children === undefined) {
          throw new Error(
            `dictionary element type "${nameOfSyntaxKind(
              firstMember.type
            )}" is not supported`
          )
        }

        return {
          kind: NodeKind.Dictionary,
          fileName: file.fileName,
          jsDoc,
          children,
          pattern: parseNodeDoc(firstMember)?.tags.patternProperties,
        }
      }, `in dictionary`)
    } else if (node.members.every(ts.isPropertySignature)) {
      return {
        kind: NodeKind.Record,
        fileName: file.fileName,
        jsDoc,
        children: Object.fromEntries(
          (node.members as readonly ts.PropertySignature[]).map((member) => {
            const value =
              member.type !== undefined
                ? nodeToAst(member.type, file, checker, program)
                : undefined

            if (value === undefined) {
              throw new Error(
                `property type "${
                  member.type === undefined
                    ? "undefined"
                    : nameOfSyntaxKind(member.type)
                }" is not supported`
              )
            }

            return [
              propertyNameToString(member.name),
              {
                jsDoc: parseNodeDoc(member),
                isRequired: member.questionToken === undefined,
                value,
                isReadOnly:
                  member.modifiers?.some(
                    (modifier) =>
                      modifier.kind === ts.SyntaxKind.ReadonlyKeyword
                  ) ?? false,
              },
            ]
          })
        ),
      }
    } else {
      throw new Error(
        "mixing index signatures and fixed properties is not supported"
      )
    }
  } else if (ts.isToken(node)) {
    const jsDoc = parseNodeDoc(node.parent)

    if (ts.isIdentifier(node)) {
      return {
        kind: NodeKind.Reference,
        fileName: file.fileName,
        jsDoc,
        name: { segment: node.text },
      }
    }

    switch (node.kind) {
      case ts.SyntaxKind.NumberKeyword: {
        return {
          kind: NodeKind.Token,
          fileName: file.fileName,
          token: TokenKind.Number,
          jsDoc,
        }
      }

      case ts.SyntaxKind.StringKeyword: {
        return {
          kind: NodeKind.Token,
          fileName: file.fileName,
          token: TokenKind.String,
          jsDoc,
        }
      }

      case ts.SyntaxKind.BooleanKeyword: {
        return {
          kind: NodeKind.Token,
          fileName: file.fileName,
          token: TokenKind.Boolean,
          jsDoc,
        }
      }

      default:
        throw new Error(
          `node of type "${nameOfSyntaxKind(node)}" is not a type keyword`
        )
    }
  } else if (ts.isTypeReferenceNode(node)) {
    const jsDoc = parseNodeDoc(node.parent)
    const name = entityNameToReferenceQualifiedName(node.typeName)
    const typeArguments =
      node.typeArguments === undefined
        ? undefined
        : nodesToAst(node.typeArguments, file, checker, program)

    // // Does not always work
    // const originFile = checker
    //   .getTypeAtLocation(node.typeName)
    //   .aliasSymbol?.getDeclarations()?.[0]
    //   ?.getSourceFile()

    const symbolDeclaration = checker
      .getSymbolAtLocation(node.typeName)
      ?.getDeclarations()?.[0]

    const originFileName =
      symbolDeclaration &&
      ts.isImportSpecifier(symbolDeclaration) &&
      ts.isStringLiteral(symbolDeclaration.parent.parent.parent.moduleSpecifier)
        ? changeExtension(
            join(
              dirname(file.fileName),
              symbolDeclaration.parent.parent.parent.moduleSpecifier.text
            ),
            ".js",
            ".ts"
          )
        : undefined

    return {
      kind: NodeKind.Reference,
      fileName: file.fileName,
      jsDoc,
      name,
      typeArguments,
      resolvedFileName: originFileName,
    }
  } else if (ts.isImportSpecifier(node)) {
    const jsDoc = parseNodeDoc(node.parent)

    return {
      kind: NodeKind.Reference,
      fileName: file.fileName,
      jsDoc,
      name: { segment: node.name.text },
    }
  } else if (ts.isArrayTypeNode(node)) {
    const jsDoc = parseNodeDoc(node.parent)

    return attachStructureTraceOnError((): ChildNode => {
      const elements = nodeToAst(node.elementType, file, checker, program)

      if (elements === undefined) {
        throw new Error(
          `array element type "${nameOfSyntaxKind(
            node.elementType
          )}" is not supported`
        )
      }

      return {
        kind: NodeKind.Array,
        fileName: file.fileName,
        jsDoc,
        children: elements,
      }
    }, `in array`)
  } else if (ts.isUnionTypeNode(node)) {
    const jsDoc = parseNodeDoc(node.parent)

    return attachStructureTraceOnError(
      (): ChildNode => ({
        kind: NodeKind.Union,
        fileName: file.fileName,
        jsDoc,
        children: nodesToAst(node.types, file, checker, program),
      }),
      `in union`
    )
  } else if (ts.isIntersectionTypeNode(node)) {
    const jsDoc = parseNodeDoc(node.parent)

    const intersectedNodes = attachStructureTraceOnError(
      () => nodesToAst(node.types, file, checker, program),
      `in intersection`
    )

    return {
      kind: NodeKind.Intersection,
      fileName: file.fileName,
      jsDoc,
      children: intersectedNodes,
    }
  } else if (ts.isLiteralTypeNode(node)) {
    const jsDoc = parseNodeDoc(node.parent)

    const isBooleanLiteral = (
      literal: ts.LiteralTypeNode["literal"]
    ): literal is ts.BooleanLiteral =>
      literal.kind === ts.SyntaxKind.TrueKeyword ||
      literal.kind === ts.SyntaxKind.FalseKeyword

    if (ts.isStringLiteral(node.literal)) {
      return {
        kind: NodeKind.Literal,
        fileName: file.fileName,
        jsDoc,
        value: node.literal.text,
      }
    } else if (ts.isNumericLiteral(node.literal)) {
      return {
        kind: NodeKind.Literal,
        fileName: file.fileName,
        jsDoc,
        value: Number.parseFloat(node.literal.text),
      }
    } else if (isBooleanLiteral(node.literal)) {
      return {
        kind: NodeKind.Literal,
        fileName: file.fileName,
        jsDoc,
        value: node.literal.kind === ts.SyntaxKind.TrueKeyword,
      }
    } else {
      throw new Error(
        `literal of type "${nameOfSyntaxKind(node.literal)}" is not supported`
      )
    }
  } else if (ts.isTupleTypeNode(node)) {
    const jsDoc = parseNodeDoc(node.parent)

    return attachStructureTraceOnError(
      (): ChildNode => ({
        kind: NodeKind.Tuple,
        fileName: file.fileName,
        jsDoc,
        children: nodesToAst(node.elements, file, checker, program),
      }),
      `in tuple`
    )
  } else if (ts.isParenthesizedTypeNode(node)) {
    return nodeToAst(node.type, file, checker, program)
  } else {
    console.warn(`node of type "${nameOfSyntaxKind(node)}" is not supported`)
  }
}

const importNodesToAst = (
  nodes: ts.NodeArray<ts.Statement>,
  file: ts.SourceFile,
  checker: ts.TypeChecker,
  program: ts.Program
): ImportNode[] =>
  nodes.flatMap((node) => importNodeToAst(node, file, checker, program))

const importNodeToAst = (
  node: ts.Statement,
  file: ts.SourceFile,
  checker: ts.TypeChecker,
  program: ts.Program
): ImportNode[] => {
  if (
    ts.isImportDeclaration(node) &&
    node.importClause?.namedBindings !== undefined
  ) {
    const fileName = checker
      .getSymbolAtLocation(node.moduleSpecifier)
      ?.declarations?.[0]?.getSourceFile().fileName

    if (fileName === undefined) {
      throw new Error(`could not find file name for import`)
    }

    const defaultImport: ImportNode[] =
      node.importClause.name === undefined
        ? []
        : [
            {
              kind: NodeKind.DefaultImport,
              name: node.importClause.name.text,
              fileName,
            },
          ]

    if (ts.isNamedImports(node.importClause.namedBindings)) {
      return [
        ...defaultImport,
        ...node.importClause.namedBindings.elements.map(
          (namedImport): ImportNode => {
            if (namedImport.propertyName === undefined) {
              return {
                kind: NodeKind.NamedImport,
                name: namedImport.name.text,
                fileName,
              }
            } else {
              return {
                kind: NodeKind.NamedImport,
                name: namedImport.propertyName.text,
                alias: namedImport.name.text,
                fileName,
              }
            }
          }
        ),
      ]
    } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
      return [
        ...defaultImport,
        {
          kind: NodeKind.NamespaceImport,
          name: node.importClause.namedBindings.name.text,
          fileName,
        },
      ]
    } else {
      return []
    }
  } else {
    return []
  }
}

const existsChild = (
  qualifiedNameArray: string[],
  node: StatementNode
): boolean => {
  if (node.kind === NodeKind.Group) {
    return node.children.some((child) =>
      existsChild(qualifiedNameArray.slice(1), child)
    )
  } else if (
    node.kind === NodeKind.TypeDefinition &&
    qualifiedNameArray.length === 1
  ) {
    return node.name === qualifiedNameArray[0]
  } else {
    return false
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
export const fileToAst = (
  file: ts.SourceFile,
  checker: ts.TypeChecker,
  program: ts.Program
): RootNode => {
  const jsDoc = parseModuleDoc(file)

  const root: RootNode = {
    kind: NodeKind.Root,
    fileName: file.fileName,
    jsDoc,
    imports: importNodesToAst(file.statements, file, checker, program),
    children: statementNodesToAst(file.statements, file, checker, program),
  }

  if (
    root.jsDoc?.tags.main !== undefined &&
    !root.children.some((child) =>
      existsChild(root.jsDoc!.tags.main!.split("."), child)
    )
  ) {
    throw TypeError(
      `main tag "${root.jsDoc?.tags.main}" points to a type that does not exist`
    )
  }

  return root
}
