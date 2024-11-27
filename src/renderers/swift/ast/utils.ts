import { filterNonNullable } from "@optolith/helpers/array"
import { compositionType, compositionTypeElement } from "./creators.js"
import { TypeNode } from "./types.js"

export const joinTypes = (
  ...types: (TypeNode | undefined)[]
): TypeNode | undefined => {
  const nonNullableTypes = filterNonNullable(types)

  if (nonNullableTypes.length === 0) {
    return undefined
  }

  if (nonNullableTypes.length === 1) {
    return nonNullableTypes[0]!
  }

  return compositionType(
    nonNullableTypes.map((type) => compositionTypeElement(type))
  )
}
