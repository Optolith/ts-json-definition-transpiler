import { dirname, format, parse, relative } from "node:path/posix"
import { NamedImport, NodeKind, ReferenceNode, RootNode } from "../ast.js"
import { qualifiedNameToArray } from "./qualifiedName.js"

export const getRelativeExternalPath = (
  node: ReferenceNode,
  file: RootNode,
  ext: string
) => {
  const externalSourceFilePath =
    node.resolvedFileName !== file.fileName ? node.resolvedFileName : undefined

  const externalSourceFilePathParts = externalSourceFilePath
    ? parse(relative(dirname(file.fileName), externalSourceFilePath))
    : undefined

  if (externalSourceFilePathParts) {
    // @ts-expect-error Allowed by Node.js documentation
    externalSourceFilePathParts.base = undefined
    externalSourceFilePathParts.ext = ext
  }

  let externalFilePath = externalSourceFilePathParts
    ? format(externalSourceFilePathParts)
    : ""

  if (!externalFilePath.startsWith(".") && externalFilePath !== "") {
    externalFilePath = "./" + externalFilePath
  }

  return externalFilePath
}

export const getFullyQualifiedNameAsPath = (
  node: ReferenceNode,
  file: RootNode
) => {
  const isNamespaceImport = file.imports.some(
    (importNode) =>
      importNode.kind === NodeKind.NamespaceImport &&
      importNode.name === node.name.segment
  )

  return qualifiedNameToArray(node.name)
    .slice(isNamespaceImport ? 1 : 0)
    .join("/")
}

export const getAliasedImportName = (node: ReferenceNode, file: RootNode) =>
  node.name.right === undefined
    ? file.imports.find(
        (importNode): importNode is NamedImport =>
          importNode.kind === NodeKind.NamedImport &&
          importNode.alias === node.name.segment
      )?.name
    : undefined
