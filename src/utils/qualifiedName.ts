import { QualifiedName } from "../ast.js"

export const qualifiedNameToArray = (name: QualifiedName): string[] => {
  if (name.right) {
    return [name.segment, ...qualifiedNameToArray(name.right)]
  }
  return [name.segment]
}

export const getRightmostQualifiedNameSegment = (
  name: QualifiedName
): string => {
  if (name.right) {
    return getRightmostQualifiedNameSegment(name.right)
  }
  return name.segment
}
