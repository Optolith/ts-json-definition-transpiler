import { ChildNode, JSDoc, NodeKind, parentGroupToArray, RootNode, TokenKind } from "./ast"

/**
 * Descriptive annotations of the JSON type definition
 */
interface Annotated {
  title?: string
  description?: string
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

interface Tuple extends Annotated {
  type: "array"
  items: Definition[]
  minItems: number
  maxItems: number
  additionalItems: false
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

export interface JsonSchema extends Annotated {
  $schema: string
  $id: string
  $ref?: string
  definitions: {
    [id: string]: Definition
  }
}

const toAnnotations = (jsDoc: JSDoc.Type | undefined) => ({
  title: jsDoc?.tags.title,
  description: jsDoc?.comment,
})


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

const toConstraints = <T extends keyof ConstraintsByType>(jsDoc: JSDoc.Type | undefined, type: T): ConstraintsByType[T] =>
  Object.fromEntries(
    jsDoc
      ? (Object.keys(constraintsByType[type]) as (keyof ConstraintsByType[T])[])
        .flatMap(
          (key) => {
            if (jsDoc.tags[key as keyof JSDoc.TagValueTypes] !== undefined) {
              return [[key, jsDoc.tags[key as keyof JSDoc.TagValueTypes]]]
            }
            else {
              return []
            }
          }
        )
      : []
  )

const nodeToDefinition = (node: ChildNode): Definition => {
  switch (node.kind) {
    case NodeKind.Record: {
      return {
        ...toAnnotations(node.jsDoc),
        type: "object",
        properties: Object.fromEntries(
          Object.entries(node.elements)
            .map(([key, config]) => [key, nodeToDefinition(config.value)])),
        required: Object.entries(node.elements)
          .filter(([_, config]) => config.required)
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
          patternProperties: {
            [node.pattern]: nodeToDefinition(node.elements)
          },
          ...toConstraints(node.jsDoc, "object"),
          additionalProperties: false
        }
      }
      else {
        return {
          ...toAnnotations(node.jsDoc),
          type: "object",
          additionalProperties: nodeToDefinition(node.elements),
          ...toConstraints(node.jsDoc, "object")
        }
      }
    }
    case NodeKind.Array: {
      return {
        ...toAnnotations(node.jsDoc),
        type: "array",
        items: nodeToDefinition(node.elements),
        ...toConstraints(node.jsDoc, "array")
      }
    }
    case NodeKind.Enumeration: {
      return {
        ...toAnnotations(node.jsDoc),
        enum: node.cases.map(({ value }) => value)
      }
    }
    case NodeKind.Tuple: {
      return {
        ...toAnnotations(node.jsDoc),
        type: "array",
        items: node.elements.map(nodeToDefinition),
        minItems: node.elements.length,
        maxItems: node.elements.length,
        additionalItems: false,
      }
    }
    case NodeKind.Union: {
      return {
        ...toAnnotations(node.jsDoc),
        oneOf: node.cases.map(nodeToDefinition)
      }
    }
    case NodeKind.Group: {
      return Object.fromEntries(
        Object.entries(node.elements)
          .map(([key, node]) => [key, nodeToDefinition(node)])
      ) as Group
    }
    case NodeKind.Literal: {
      return {
        ...toAnnotations(node.jsDoc),
        const: node.value
      }
    }
    case NodeKind.Reference: {
      const externalFilePath = node.externalFilePath ? `${node.externalFilePath}.schema.json` : ""
      const qualifiedName = [...parentGroupToArray(node.parentGroup), node.name].join("/")

      return {
        ...toAnnotations(node.jsDoc),
        $ref: `${externalFilePath}#/definitions/${qualifiedName}`
      }
    }
    case NodeKind.Token: {
      switch (node.token) {
        case TokenKind.Number: {
          return {
            ...toAnnotations(node.jsDoc),
            type: node.jsDoc?.tags.integer ? "integer" : "number",
            ...toConstraints(node.jsDoc, "number")
          }
        }

        case TokenKind.String: {
          return {
            ...toAnnotations(node.jsDoc),
            type: "string",
            ...toConstraints(node.jsDoc, "string")
          }
        }

        case TokenKind.Boolean: {
          return {
            ...toAnnotations(node.jsDoc),
            type: "boolean"
          }
        }
      }
    }
  }
}

export const astToJsonSchema = (file: RootNode, schemaFileName: string): JsonSchema => {
  const mainType = file.jsDoc?.tags.main

  return {
    $schema: "http://json-schema.org/draft-07/schema",
    $id: schemaFileName,
    $ref: mainType ? `#/definitions/${mainType}` : mainType,
    definitions: Object.fromEntries(
      Object.entries(file.elements)
        .map(([key, node]) => [key, nodeToDefinition(node)])
    )
  }
}

export const jsonSchemaToFileContent = (schema: JsonSchema): string =>
  `${JSON.stringify(schema, undefined, 2)}\n`
