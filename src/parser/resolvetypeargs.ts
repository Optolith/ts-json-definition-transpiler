import {
  ContentNode,
  EnumerationNode,
  ExportAssignmentNode,
  NodeKind,
  QualifiedName,
  ReferenceNode,
  RootNode,
  StatementNode,
  TypeDefinitionNode,
  isExportAssignmentNode,
} from "../ast.js"
import { assertExhaustive } from "../utils/assertExhaustive.js"
import { isNotNullish } from "../utils/nullable.js"

enum ScopeTypeKind {
  Default,
  TypeArgument,
  NamespaceImport,
}

type TypeInScope<Node> = {
  node: Node
  kind: ScopeTypeKind
}

type TypesInScope = {
  [key: string]: TypeInScope<RootNode | StatementNode>
}

const resolveQualifiedName = (
  name: QualifiedName,
  node: RootNode | StatementNode
): EnumerationNode | TypeDefinitionNode | ExportAssignmentNode | undefined => {
  switch (node.kind) {
    case NodeKind.Root:
    case NodeKind.Group: {
      const childNode = node.children.find(
        (child) => child.name === name.segment
      )

      switch (childNode?.kind) {
        case NodeKind.Group:
          return name.right === undefined
            ? undefined
            : resolveQualifiedName(name.right, childNode)
        case NodeKind.Enumeration:
          return name.right === undefined ? childNode : undefined
        case NodeKind.TypeDefinition:
          return name.right === undefined ? childNode : undefined
        case NodeKind.ExportAssignment:
          return name.right === undefined ? childNode : undefined
        case undefined:
          return undefined
        default:
          return undefined
      }
    }
    case NodeKind.Enumeration:
    case NodeKind.TypeDefinition:
    case NodeKind.ExportAssignment:
      return undefined
    default:
      return assertExhaustive(node)
  }
}

const resolveQualifiedNameInScope = (
  name: QualifiedName,
  typesInScope: TypesInScope
):
  | TypeInScope<EnumerationNode | TypeDefinitionNode | ExportAssignmentNode>
  | undefined => {
  const type = typesInScope[name.segment]
  if (name.right === undefined) {
    if (type === undefined) {
      return undefined
    }
    switch (type.node.kind) {
      case NodeKind.Group:
        return undefined
      case NodeKind.Enumeration:
        return { node: type.node, kind: type.kind }
      case NodeKind.TypeDefinition:
        return { node: type.node, kind: type.kind }
      case NodeKind.ExportAssignment:
        return { node: type.node, kind: type.kind }
      case NodeKind.Root:
        return undefined
      default:
        return assertExhaustive(type.node)
    }
  } else if (type !== undefined) {
    const node = resolveQualifiedName(name.right, type.node)
    if (node === undefined) {
      return undefined
    }
    return { node, kind: type.kind }
  } else {
    return undefined
  }
}

const mapTypeParametersToArgumentsInScope = (
  node: TypeDefinitionNode,
  typesInScope: TypesInScope,
  file: RootNode,
  files: Record<string, RootNode>,
  reference?: ReferenceNode
) =>
  Object.fromEntries(
    node.typeParameters?.map(
      (child, index): [string, TypeInScope<RootNode | StatementNode>] => {
        const argument = reference?.typeArguments?.[index] ?? child.default

        if (argument === undefined) {
          throw new Error(
            `Type argument ${index} is missing for type parameter "${child.name}" for type "${node.name}" and no default value is provided`
          )
        }

        const resolvedArgument = resolveTypeArgumentsForNode(
          argument,
          typesInScope,
          file,
          files
        )

        if (resolvedArgument === undefined) {
          throw new Error(
            `Type argument ${index} could not be resolved for type parameter "${child.name}" for type "${node.name}"`
          )
        }

        return [
          child.name,
          {
            node: {
              kind: NodeKind.TypeDefinition,
              fileName: node.fileName,
              name: child.name,
              definition: resolvedArgument,
            },
            kind: ScopeTypeKind.TypeArgument,
          },
        ]
      }
    ) ?? []
  )

const resolveTypeArgumentsForNode = <T extends ContentNode>(
  node: T,
  typesInScope: TypesInScope,
  file: RootNode,
  files: Record<string, RootNode>
): T | undefined => {
  switch (node.kind) {
    case NodeKind.Root: {
      const children = node.children
        .map((child) =>
          resolveTypeArgumentsForNode(child, typesInScope, file, files)
        )
        .filter(isNotNullish)

      if (children.length > 0) {
        return {
          ...node,
          children,
        }
      } else {
        return undefined
      }
    }
    case NodeKind.Group: {
      const children = node.children
        .map((child) =>
          resolveTypeArgumentsForNode(child, typesInScope, file, files)
        )
        .filter(isNotNullish)

      if (children.length === 0) {
        return undefined
      }

      return {
        ...node,
        children,
      }
    }
    case NodeKind.Record: {
      const children = Object.entries(node.children).map(([key, value]) => {
        const child = resolveTypeArgumentsForNode(
          value.value,
          typesInScope,
          file,
          files
        )
        if (child === undefined) {
          return undefined
        }
        return [key, { ...value, value: child }]
      })

      if (children.every(isNotNullish)) {
        return {
          ...node,
          children: Object.fromEntries(children),
        }
      }

      return undefined
    }
    case NodeKind.Dictionary: {
      const children = resolveTypeArgumentsForNode(
        node.children,
        typesInScope,
        file,
        files
      )

      if (children === undefined) {
        return undefined
      }

      return {
        ...node,
        children,
      }
    }
    case NodeKind.Token:
      return node
    case NodeKind.Reference: {
      const actualTypesInScope = {
        ...rootTypesInScope(files, files[node.fileName]!),
        ...Object.fromEntries(
          Object.entries(typesInScope).filter(
            ([_key, value]) => value.kind === ScopeTypeKind.TypeArgument
          )
        ),
      }

      const { node: referencedType, kind = ScopeTypeKind.Default } =
        resolveQualifiedNameInScope(node.name, actualTypesInScope) ?? {}

      if (referencedType === undefined) {
        return undefined
      }

      const nodeWithTargetFileName: ReferenceNode = {
        ...node,
        resolvedFileName: referencedType.fileName,
      }

      if (
        referencedType.kind !== NodeKind.TypeDefinition ||
        node.typeArguments === undefined
      ) {
        if (kind === ScopeTypeKind.TypeArgument) {
          switch (referencedType.kind) {
            case NodeKind.Enumeration:
              return nodeWithTargetFileName as T
            case NodeKind.TypeDefinition:
              return referencedType.definition as T
            case NodeKind.ExportAssignment:
              return nodeWithTargetFileName as T
            default:
              return nodeWithTargetFileName as T
          }
        } else {
          return nodeWithTargetFileName as T
        }
      }

      const newTypeArguments = mapTypeParametersToArgumentsInScope(
        referencedType,
        typesInScope,
        file,
        files,
        node
      )

      return resolveTypeArgumentsForNode(
        referencedType.definition,
        {
          ...typesInScope,
          ...newTypeArguments,
        },
        file,
        files
      ) as T | undefined
    }
    case NodeKind.Enumeration:
      return node
    case NodeKind.Array: {
      const children = resolveTypeArgumentsForNode(
        node.children,
        typesInScope,
        file,
        files
      )

      if (children === undefined) {
        return undefined
      }

      return {
        ...node,
        children,
      }
    }
    case NodeKind.Union: {
      const children = node.children.map((child) =>
        resolveTypeArgumentsForNode(child, typesInScope, file, files)
      )

      if (children.every(isNotNullish)) {
        return {
          ...node,
          children,
        }
      }

      return undefined
    }
    case NodeKind.Intersection: {
      const children = node.children.map((child) =>
        resolveTypeArgumentsForNode(child, typesInScope, file, files)
      )

      if (children.every(isNotNullish)) {
        return {
          ...node,
          children,
        }
      }

      return undefined
    }
    case NodeKind.Literal:
      return node
    case NodeKind.Tuple: {
      const children = node.children.map((child) =>
        resolveTypeArgumentsForNode(child, typesInScope, file, files)
      )

      if (children.every(isNotNullish)) {
        return {
          ...node,
          children,
        }
      }

      return undefined
    }
    case NodeKind.TypeDefinition: {
      if (
        (node.typeParameters?.filter((p) => p.default === undefined).length ??
          0) > 0
      ) {
        return undefined
      }

      const newTypeArguments = mapTypeParametersToArgumentsInScope(
        node,
        typesInScope,
        file,
        files
      )

      const newTypesInScope = Object.entries(newTypeArguments).reduce(
        (acc, [key, value]) => {
          if (
            acc[key] === undefined ||
            acc[key]!.kind !== ScopeTypeKind.TypeArgument
          ) {
            acc[key] = value
          }
          return acc
        },
        { ...typesInScope }
      )

      const definition = resolveTypeArgumentsForNode(
        node.definition,
        newTypesInScope,
        file,
        files
      )

      if (definition === undefined) {
        return undefined
      }

      return {
        ...node,
        definition,
      }
    }
    case NodeKind.ExportAssignment:
      return {
        ...node,
        expression: resolveTypeArgumentsForNode(
          node.expression,
          typesInScope,
          file,
          files
        ),
      }
    default:
      return assertExhaustive(node)
  }
}

const rootTypesInScope = (
  files: Record<string, RootNode>,
  file: RootNode
): TypesInScope => {
  const importedTypesInScope =
    file.imports?.reduce<TypesInScope>((acc, importNode) => {
      const importedFile = files[importNode.fileName]

      switch (importNode.kind) {
        case NodeKind.DefaultImport: {
          const defaultImport = importedFile?.children.find(
            isExportAssignmentNode
          )
          if (defaultImport) {
            acc[importNode.name] = {
              node: defaultImport,
              kind: ScopeTypeKind.Default,
            }
          }
          break
        }
        case NodeKind.NamedImport: {
          const namedImport = importedFile?.children.find(
            (statement) => statement.name === importNode.name
          )
          if (namedImport) {
            acc[importNode.alias ?? importNode.name] = {
              node: namedImport,
              kind: ScopeTypeKind.Default,
            }
          }
          break
        }
        case NodeKind.NamespaceImport: {
          if (importedFile) {
            acc[importNode.name] = {
              node: importedFile,
              kind: ScopeTypeKind.NamespaceImport,
            }
          }
          break
        }
        default:
          return assertExhaustive(importNode)
      }

      return acc
    }, {}) ?? {}

  const localTypesInScope = file.children.reduce<TypesInScope>((acc, child) => {
    switch (child.kind) {
      case NodeKind.Enumeration:
        acc[child.name] = { node: child, kind: ScopeTypeKind.Default }
        break
      case NodeKind.TypeDefinition:
        acc[child.name] = { node: child, kind: ScopeTypeKind.Default }
        break
      case NodeKind.ExportAssignment:
        // ignore name
        break
      case NodeKind.Group:
        acc[child.name] = { node: child, kind: ScopeTypeKind.Default }
        break
      default:
        return assertExhaustive(child)
    }

    return acc
  }, {})

  return { ...importedTypesInScope, ...localTypesInScope }
}

export const resolveTypeArgumentsForFile = (
  files: Record<string, RootNode>,
  file: RootNode
): RootNode | undefined =>
  resolveTypeArgumentsForNode(file, rootTypesInScope(files, file), file, files)
