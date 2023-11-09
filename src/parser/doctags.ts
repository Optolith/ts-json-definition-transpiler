import ts from "typescript"
import { DocTagTypes, DocTags } from "../ast.js"
import { flattenComment } from "./doccomment.js"

/**
 * A dictionary from all supported tag names to their value types.
 */
const docTagTypes: DocTagTypes = {
  // General
  main: "string",
  title: "string",
  default: "unknown",

  // String
  minLength: "integer",
  maxLength: "integer",
  pattern: "string",
  format: "string",
  markdown: "boolean",

  // Numeric
  integer: "boolean",
  minimum: "number",
  maximum: "number",
  multipleOf: "number",
  exclusiveMinimum: "number",
  exclusiveMaximum: "number",

  // Object
  minProperties: "integer",
  maxProperties: "integer",
  patternProperties: "string",

  // Array
  minItems: "integer",
  maxItems: "integer",
  uniqueItems: "boolean",
}

const parseDocTagComment = <K extends keyof DocTags>(
  name: K,
  comment: string | undefined
): DocTags[K] => {
  switch (docTagTypes[name]) {
    case "boolean":
      return (comment === "true" || !comment) as DocTags[K]
    case "number":
      return (
        comment === undefined ? 0 : Number.parseFloat(comment)
      ) as DocTags[K]
    case "integer":
      return (
        comment === undefined ? 0 : Number.parseInt(comment)
      ) as DocTags[K]
    case "unknown":
      return (
        comment === undefined ? undefined : JSON.parse(comment)
      ) as DocTags[K]
    default:
      return (comment ?? "") as DocTags[K]
  }
}

const parseDocTag = (
  tag: ts.JSDocTag
): [keyof DocTags, DocTags[keyof DocTags]] => [
  tag.tagName.text as keyof DocTags,
  parseDocTagComment(
    tag.tagName.text as keyof DocTags,
    flattenComment(tag.comment)
  ),
]

/**
 * Parses all JSON Schema tags into their proper types.
 */
export const parseDocTags = (
  tags: ts.NodeArray<ts.JSDocTag> | undefined
): DocTags => Object.fromEntries(tags?.map(parseDocTag) ?? [])
