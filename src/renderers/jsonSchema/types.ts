/**
 * Descriptive annotations of the JSON type definition
 */
export interface Annotated {
  title?: string
  description?: string
  default?: unknown
  readOnly?: boolean
}

export interface ObjectConstraints {
  minProperties?: number
  maxProperties?: number
}

export interface ObjectBase extends ObjectConstraints, Annotated {
  type: "object"
}

export interface StrictObject extends ObjectBase {
  properties: {
    [key: string]: Definition
  }
  required: string[]
  additionalProperties?: boolean
}

export const isStrictObject = (def: Definition): def is StrictObject =>
  typeof def === "object" && "properties" in def

export interface PatternDictionary extends ObjectBase {
  patternProperties: {
    [pattern: string]: Definition
  }
  additionalProperties?: boolean
}

export interface Dictionary extends ObjectBase {
  additionalProperties: Definition
}

export interface ArrayConstraints {
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
}

export interface Array extends ArrayConstraints, Annotated {
  type: "array"
  items: Definition
}

export type Tuple = Tuple07 | Tuple202012

export interface Tuple07 extends Annotated {
  type: "array"
  items: Definition[]
  minItems: number
  maxItems: number
  additionalItems: boolean
}

export interface Tuple202012 extends Annotated {
  type: "array"
  prefixItems: Definition[]
  minItems: number
  maxItems: number
  items: false
}

export interface NumberConstraints {
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  multipleOf?: number
}

export interface Number extends NumberConstraints, Annotated {
  type: "number" | "integer"
}

export interface StringConstraints {
  minLength?: number
  maxLength?: number
  pattern?: number
  format?: number
}

export interface String extends StringConstraints, Annotated {
  type: "string"
}

export interface Boolean extends Annotated {
  type: "boolean"
}

export interface Union extends Annotated {
  oneOf: Definition[]
}

export interface Intersection {
  type?: "object"
  allOf: Definition[]
  unevaluatedProperties?: boolean
}

export interface Constant extends Annotated {
  const: string | number | boolean
}

export interface Enum extends Annotated {
  enum: (string | number)[]
}

export interface Reference extends Annotated {
  $ref: string
}

export const isReference = (def: Definition): def is Reference =>
  typeof def === "object" && "$ref" in def

export interface Group {
  _groupBrand: any
  [identifier: string]: Definition
}

export type Definition =
  | StrictObject
  | Dictionary
  | PatternDictionary
  | Array
  | Number
  | String
  | Boolean
  | Reference
  | Union
  | Intersection
  | Constant
  | Enum
  | Tuple
  | Group

export interface JsonSchema_07 {
  $schema: string
  $id: string
  $ref?: string
  definitions: Record<string, Definition>
}

export interface JsonSchema_2019_09 {
  $schema: string
  $id: string
  $ref?: string
  $defs: Record<string, Definition>
}

export type JsonSchema = JsonSchema_07 | JsonSchema_2019_09
