import * as ts from "typescript"
import { flattenComment } from "./doccomment.js"

/**
 * A dictionary from all supported tag names to their value types.
 */
const docTagTypes = {
  // General
  main: "string",
  title: "string",

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
} as const

/**
 * A dictionary from all supported tag names to their JSON Schema data types.
 */
export type DocTagTypes = typeof docTagTypes

/**
 * A dictionary from all supported data types in JSON Schema to their
 * corresponding TypeScript data types.
 */
type JSONSchemaTypeToTypeScriptType = {
  number: number
  integer: number
  boolean: boolean
  string: string
}

/**
 * A dictionary from all supported tags to their values.
 */
export type DocTags = {
  -readonly [K in keyof DocTagTypes]?: JSONSchemaTypeToTypeScriptType[DocTagTypes[K]]
}

const parseDocTagComment = <K extends keyof DocTags>(name: K, comment: string | undefined): DocTags[K] => {
  switch (docTagTypes[name]) {
    case "boolean": return (comment === "true" || !comment) as DocTags[K]
    case "number":  return (comment === undefined ? 0 : Number.parseFloat(comment)) as DocTags[K]
    case "integer": return (comment === undefined ? 0 : Number.parseInt(comment)) as DocTags[K]
    default:        return (comment ?? "") as DocTags[K]
  }
}

const parseDocTag = (tag: ts.JSDocTag): [keyof DocTags, DocTags[keyof DocTags]] => [
  tag.tagName.text as keyof DocTags,
  parseDocTagComment(tag.tagName.text as keyof DocTags, flattenComment(tag.comment))
]

/**
 * Parses all JSON Schema tags into their proper types.
 */
export const parseDocTags = (tags: ts.NodeArray<ts.JSDocTag> | undefined): DocTags =>
  Object.fromEntries(tags?.map(parseDocTag) ?? [])
