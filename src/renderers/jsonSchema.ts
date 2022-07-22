import { EOL } from "os"
import { sep } from "path"
import { AstTransformer, Renderer } from "../main.js"
import { ChildNode, NodeKind, parentGroupToArray, TokenKind } from "../parser/ast.js"
import { Doc } from "../parser/doc.js"
import { DocTagTypes } from "../parser/doctags.js"

/**
 * Descriptive annotations of the JSON type definition
 */
interface Annotated {
  title?: string
  description?: string
  default?: unknown
}

interface ObjectConstraints {
  minProperties?: number
  maxProperties?: number
}

interface ObjectBase extends ObjectConstraints, Annotated {
  type: "object"
}

interface StrictObject extends ObjectBase {
  properties: {
    [key: string]: Definition
  }
  required: string[]
  additionalProperties: false
}

interface PatternDictionary extends ObjectBase {
  patternProperties: {
    [pattern: string]: Definition
  }
  additionalProperties: false
}

interface Dictionary extends ObjectBase {
  additionalProperties: Definition
}

interface ArrayConstraints {
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
}

interface Array extends ArrayConstraints, Annotated {
  type: "array"
  items: Definition
}

type Tuple = Tuple07 | Tuple202012

interface Tuple07 extends Annotated {
  type: "array"
  items: Definition[]
  minItems: number
  maxItems: number
  additionalItems: false
}

interface Tuple202012 extends Annotated {
  type: "array"
  prefixItems: Definition[]
  minItems: number
  maxItems: number
  items: false
}

interface NumberConstraints {
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  multipleOf?: number
}

interface Number extends NumberConstraints, Annotated {
  type: "number" | "integer"
}

interface StringConstraints {
  minLength?: number
  maxLength?: number
  pattern?: number
  format?: number
}

interface String extends StringConstraints, Annotated {
  type: "string"
}

interface Boolean extends Annotated {
  type: "boolean"
}

interface Union extends Annotated {
  oneOf: Definition[]
}

interface Constant extends Annotated {
  const: string | number | boolean
}

interface Enum extends Annotated {
  enum: (string | number)[]
}

interface Reference extends Annotated {
  $ref: string
}

interface Group {
  "guard Group": any
  [identifier: string]: Definition
}

type Definition =
  | StrictObject
  | Dictionary
  | PatternDictionary
  | Array
  | Number
  | String
  | Boolean
  | Reference
  | Union
  | Constant
  | Enum
  | Tuple
  | Group

export interface JsonSchema_07 extends Annotated {
  $schema: string
  $id: string
  $ref?: string
  definitions: {
    [id: string]: Definition
  }
}

export interface JsonSchema_2019_09 extends Annotated {
  $schema: string
  $id: string
  $ref?: string
  $defs: {
    [id: string]: Definition
  }
}

const toAnnotations = (jsDoc: Doc | undefined) => ({
  title: jsDoc?.tags.title,
  description: jsDoc?.comment,
})

const toDefault = (jsDoc: Doc | undefined) => jsDoc?.tags.default !== undefined ? {
  default: jsDoc?.tags.default,
} : undefined

type ConstraintsByType = {
  number: NumberConstraints,
  string: StringConstraints,
  object: ObjectConstraints,
  array: ArrayConstraints,
}

type IgnoreValue<T> = { [K in keyof T]-?: 0 }

type IgnoreValueEach<T> = { [K in keyof T]: IgnoreValue<T[K]> }

// ensures that each key is present in a runtime object
const constraintsByType: IgnoreValueEach<ConstraintsByType> = {
  number: { maximum: 0, minimum: 0, exclusiveMinimum: 0, exclusiveMaximum: 0, multipleOf: 0 },
  string: { minLength: 0, maxLength: 0, format: 0, pattern: 0 },
  object: { minProperties: 0, maxProperties: 0 },
  array: { minItems: 0, maxItems: 0, uniqueItems: 0 },
}

const toConstraints = <T extends keyof ConstraintsByType>(jsDoc: Doc | undefined, type: T): ConstraintsByType[T] =>
  Object.fromEntries(
    jsDoc
      ? (Object.keys(constraintsByType[type]) as (keyof ConstraintsByType[T])[])
        .flatMap(
          (key) => {
            if (jsDoc.tags[key as keyof DocTagTypes] !== undefined) {
              return [[key, jsDoc.tags[key as keyof DocTagTypes]]]
            }
            else {
              return []
            }
          }
        )
      : []
  )

const nodeToDefinition = (spec: Spec, node: ChildNode): Definition => {
  switch (node.kind) {
    case NodeKind.Record: {
      return {
        ...toAnnotations(node.jsDoc),
        type: "object",
        ...toDefault(node.jsDoc),
        properties: Object.fromEntries(
          Object.entries(node.elements)
            .map(([key, config]) => [key, nodeToDefinition(spec, config.value)])),
        required: Object.entries(node.elements)
          .filter(([_, config]) => config.isRequired)
          .map(([key]) => key),
        ...toConstraints(node.jsDoc, "object"),
        additionalProperties: false
      }
    }
    case NodeKind.Dictionary: {
      if (node.pattern !== undefined) {
        return {
          ...toAnnotations(node.jsDoc),
          type: "object",
          ...toDefault(node.jsDoc),
          patternProperties: {
            [node.pattern]: nodeToDefinition(spec, node.elements)
          },
          ...toConstraints(node.jsDoc, "object"),
          additionalProperties: false
        }
      }
      else {
        return {
          ...toAnnotations(node.jsDoc),
          type: "object",
          ...toDefault(node.jsDoc),
          additionalProperties: nodeToDefinition(spec, node.elements),
          ...toConstraints(node.jsDoc, "object")
        }
      }
    }
    case NodeKind.Array: {
      return {
        ...toAnnotations(node.jsDoc),
        type: "array",
        ...toDefault(node.jsDoc),
        items: nodeToDefinition(spec, node.elements),
        ...toConstraints(node.jsDoc, "array")
      }
    }
    case NodeKind.Enumeration: {
      return {
        ...toAnnotations(node.jsDoc),
        enum: node.cases.map(({ value }) => value),
        ...toDefault(node.jsDoc),
      }
    }
    case NodeKind.Tuple: {
      switch (spec) {
        case Spec.Draft_07:
        case Spec.Draft_2019_09: return {
          ...toAnnotations(node.jsDoc),
          type: "array",
          items: node.elements.map(element => nodeToDefinition(spec, element)),
          ...toDefault(node.jsDoc),
          minItems: node.elements.length,
          maxItems: node.elements.length,
          additionalItems: false,
        }
        case Spec.Draft_2020_12: return {
          ...toAnnotations(node.jsDoc),
          type: "array",
          prefixItems: node.elements.map(element => nodeToDefinition(spec, element)),
          ...toDefault(node.jsDoc),
          minItems: node.elements.length,
          maxItems: node.elements.length,
          items: false,
        }
        default: throw TypeError("invalid spec")
      }
    }
    case NodeKind.Union: {
      return {
        ...toAnnotations(node.jsDoc),
        oneOf: node.cases.map(element => nodeToDefinition(spec, element)),
        ...toDefault(node.jsDoc),
      }
    }
    case NodeKind.Group: {
      return Object.fromEntries(
        Object.entries(node.elements)
          .map(([key, node]) => [key, nodeToDefinition(spec, node)])
      ) as Group
    }
    case NodeKind.Literal: {
      return {
        ...toAnnotations(node.jsDoc),
        const: node.value,
        ...toDefault(node.jsDoc),
      }
    }
    case NodeKind.Reference: {
      const externalFilePath = node.externalFilePath ? `${node.externalFilePath}.schema.json` : ""
      const qualifiedName = [...parentGroupToArray(node.parentGroup), node.name].join("/")

      return {
        ...toAnnotations(node.jsDoc),
        $ref: `${externalFilePath}#/${defsKey(spec)}/${qualifiedName}`,
        ...toDefault(node.jsDoc),
      }
    }
    case NodeKind.Token: {
      switch (node.token) {
        case TokenKind.Number: {
          return {
            ...toAnnotations(node.jsDoc),
            type: node.jsDoc?.tags.integer ? "integer" : "number",
            ...toDefault(node.jsDoc),
            ...toConstraints(node.jsDoc, "number")
          }
        }

        case TokenKind.String: {
          return {
            ...toAnnotations(node.jsDoc),
            type: "string",
            ...toDefault(node.jsDoc),
            ...toConstraints(node.jsDoc, "string")
          }
        }

        case TokenKind.Boolean: {
          return {
            ...toAnnotations(node.jsDoc),
            type: "boolean",
            ...toDefault(node.jsDoc),
          }
        }
      }
    }
  }
}

const toForwardSlashAbsolutePath = (path: string) => "/" + path.split(sep).join("/")

type TransformerOptions = {
  spec: Spec
}

const astToJsonSchema = ({ spec }: TransformerOptions): AstTransformer =>
  (file, { relativePath }): string => {
    const mainType = file.jsDoc?.tags.main

    const jsonSchema = {
      $schema: schemaUri(spec),
      $id: toForwardSlashAbsolutePath(relativePath),
      $ref: mainType ? `#/${defsKey(spec)}/${mainType}` : mainType,
      [defsKey(spec)]: Object.fromEntries(
        Object.entries(file.elements)
          .map(([key, node]) => [key, nodeToDefinition(spec, node)])
      )
    }

    return `${JSON.stringify(jsonSchema, undefined, 2).replace(/\n/g, EOL)}${EOL}`
  }

export enum Spec {
  Draft_07 = 1,
  Draft_2019_09 = 2,
  Draft_2020_12 = 3,
}

const defsKey = (spec: Spec): string => {
  switch (spec) {
    case Spec.Draft_07: return "definitions"
    case Spec.Draft_2019_09:
    case Spec.Draft_2020_12: return "$defs"
    default: throw TypeError("invalid spec")
  }
}

const schemaUri = (spec: Spec): string => {
  switch (spec) {
    case Spec.Draft_07: return "https://json-schema.org/draft-07/schema"
    case Spec.Draft_2019_09: return "https://json-schema.org/draft/2019-09/schema"
    case Spec.Draft_2020_12: return "https://json-schema.org/draft/2020-12/schema"
    default: throw TypeError("invalid spec")
  }
}

type RendererOptions = {
  /**
   * The used JSON Schema specification.
   * @default Spec.Draft_2020_12
   */
  spec?: Spec
}

export const jsonSchemaRenderer = ({
  spec = Spec.Draft_2020_12
}: RendererOptions = {}): Renderer => Object.freeze({
  transformer: astToJsonSchema({ spec }),
  fileExtension: ".schema.json",
})
