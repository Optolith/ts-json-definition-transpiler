import { assertExhaustive } from "@optolith/helpers/typeSafety"
import { MemberNode, Node, NodeKind } from "../ast.js"

export const ignoreNode = (node: Node | MemberNode, env: string): boolean => {
  switch (node.kind) {
    case NodeKind.Root:
    case NodeKind.Group:
    case NodeKind.Record:
    case NodeKind.Member:
    case NodeKind.Dictionary:
    case NodeKind.Token:
    case NodeKind.Reference:
    case NodeKind.Enumeration:
    case NodeKind.EnumerationCase:
    case NodeKind.Array:
    case NodeKind.Union:
    case NodeKind.Literal:
    case NodeKind.Tuple:
    case NodeKind.ExportAssignment:
    case NodeKind.TypeDefinition:
    case NodeKind.Intersection: {
      const ignoreTag = node.jsDoc?.tags.ignore
      return (
        ignoreTag !== undefined &&
        (ignoreTag === "" || ignoreTag.split(" ").includes(env))
      )
    }

    case NodeKind.TypeParameter:
    case NodeKind.DefaultImport:
    case NodeKind.NamedImport:
    case NodeKind.NamespaceImport:
      return false

    default:
      return assertExhaustive(node)
  }
}
