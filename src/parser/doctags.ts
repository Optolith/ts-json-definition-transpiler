import * as ts from "typescript"
import { flattenComment } from "./doccomment.js"

/**
 * A dictionary from all supported tag names to their value types.
 */
const tagTypes = {
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
export type TagTypes = typeof tagTypes

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
export type Tags = {
  -readonly [K in keyof TagTypes]?: JSONSchemaTypeToTypeScriptType[TagTypes[K]]
}

const parseTagComment = <K extends keyof Tags>(name: K, comment: string | undefined): Tags[K] => {
  switch (tagTypes[name]) {
    case "boolean": return (comment === "true" || !comment) as Tags[K]
    case "number":  return (comment === undefined ? 0 : Number.parseFloat(comment)) as Tags[K]
    case "integer": return (comment === undefined ? 0 : Number.parseInt(comment)) as Tags[K]
    default:        return (comment ?? "") as Tags[K]
  }
}

const parseTag = (tag: ts.JSDocTag): [keyof Tags, Tags[keyof Tags]] => [
  tag.tagName.text as keyof Tags,
  parseTagComment(tag.tagName.text as keyof Tags, flattenComment(tag.comment))
]

/**
 * Parses all JSON Schema tags into their proper types.
 */
export const parseTags = (tags: ts.NodeArray<ts.JSDocTag> | undefined): Tags =>
  Object.fromEntries(tags?.map(parseTag) ?? [])
