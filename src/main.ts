import { Dirent, mkdirSync, readdirSync, writeFileSync } from "fs"
import { basename, extname, join, sep } from "path"
import * as ts from "typescript"

namespace JsonSchema {
  export type ConstraintKey = "minimum" | "maximum" | "minProperties" | "maxProperties" | "minLength" | "maxLength" | "format" | "minItems" | "maxItems" | "uniqueItems" | "pattern" | "format"

  export type ConstraintValueType = "integer" | "numeric" | "boolean"

  export type ValueType = "object" | "number" | "string" | "array"

  /**
   * Descriptive annotations of the JSON type definition
   */
  export interface Annotated {
    title?: string
    description?: string
  }

  export interface ObjectBase extends Annotated {
    type: "object"
  }

  export interface StrictObject extends ObjectBase {
    properties: {
      [key: string]: Definition
    }
    required: string[]
    additionalProperties: false
  }

  export interface PatternDictionary extends ObjectBase {
    patternProperties: {
      [pattern: string]: Definition
    }
    minProperties?: number
    additionalProperties: false
  }

  export interface Dictionary extends ObjectBase {
    minProperties?: number
    additionalProperties: Definition
  }

  export interface Array extends Annotated {
    type: "array"
    items: Definition
    minItems?: number
    maxItems?: number
    uniqueItems?: boolean
  }

  export interface Number extends Annotated {
    type: "number" | "integer"
    minimum?: number
    maximum?: number
  }

  export interface String extends Annotated {
    type: "string"
    minLength?: number
    maxLength?: number
    pattern?: number
    format?: number
  }

  export interface Boolean extends Annotated {
    type: "boolean"
  }

  export interface Union extends Annotated {
    oneOf: Definition[]
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

  export type Simple =
    | Number
    | String
    | Boolean
    | Constant
    | Enum
    | Reference

  export type NonStrictObject =
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
    | Constant
    | Enum

  export interface Base extends Annotated {
    $schema: string
    $id: string
    $ref?: string
    definitions: {
      [id: string]: Definition
    }
  }

  export const isStrictObject = (x: Definition): x is StrictObject =>
    (x as { type: any }).type === "object"
    && x.hasOwnProperty("properties")

  export const isDictionary = (x: Definition): x is Dictionary =>
    (x as { type: any }).type === "object"
    && !x.hasOwnProperty("properties")
    && !x.hasOwnProperty("patternProperties")

  export const isPatternDictionary = (x: Definition): x is PatternDictionary =>
    (x as { type: any }).type === "object"
    && x.hasOwnProperty("patternProperties")

  export const isArray = (x: Definition): x is Array =>
    (x as { type: any }).type === "array"

  export const isNumber = (x: Definition): x is Number =>
    (x as { type: any }).type === "number"
    || (x as { type: any }).type === "integer"

  export const isString = (x: Definition): x is String =>
    (x as { type: any }).type === "string"

  export const isBoolean = (x: Definition): x is Boolean =>
    (x as { type: any }).type === "boolean"

  export const isUnion = (x: Definition): x is Union =>
    x.hasOwnProperty("oneOf")

  export const isConstant = (x: Definition): x is Constant =>
    x.hasOwnProperty("const")

  export const isEnum = (x: Definition): x is Enum =>
    x.hasOwnProperty("enum")

  export const isReference = (x: Definition): x is Reference =>
    x.hasOwnProperty("$ref")

  export const isSimple = (x: Definition): x is Simple =>
    isNumber(x) || isString(x) || isBoolean(x) || isConstant(x) || isReference(x)

  export const constraintsByValueType: { [K in ConstraintKey]?: ConstraintValueType } = {
    minimum: "numeric",
    maximum: "numeric",
    minProperties: "integer",
    maxProperties: "integer",
    minLength: "integer",
    maxLength: "integer",
    minItems: "integer",
    maxItems: "integer",
    uniqueItems: "boolean",
  }

  export const constraintsByJsonSchemaType: { [K in ValueType]: ConstraintKey[] } = {
    number: ["minimum", "maximum"],
    string: ["minLength", "maxLength", "format", "pattern"],
    object: ["minProperties", "maxProperties"],
    array: ["minItems", "maxItems", "uniqueItems"],
  }

  export const hasKeyword = (jsDoc: ts.JSDoc | undefined, tagName: string) =>
    jsDoc?.tags?.some(tag => tag.tagName.escapedText === tagName)

  export const keywordValue = (jsDoc: ts.JSDoc | undefined, tagName: string) =>
    ts.getTextOfJSDocComment(jsDoc?.tags?.find(tag => tag.tagName.escapedText === tagName)?.comment)

  export const parseKeywordValue = (
    keyword: ConstraintKey,
    value: string,
    parseNumeric: (value: string) => number = Number.parseInt
  ) => {
    switch (constraintsByValueType[keyword]) {
      case "integer": return Number.parseInt(value)
      case "boolean": return value === "true" || value === ""
      case "numeric": return parseNumeric(value ?? "")
      default:        return value
    }
  }
}

namespace JSDoc {
  export const ofNode = (node: ts.Node) => node.getChildren().filter(ts.isJSDoc).slice(-1)[0]

  export const toAnnotations = (jsDoc: ts.JSDoc | undefined) => ({
    title: JsonSchema.keywordValue(jsDoc, "title"),
    description: ts.getTextOfJSDocComment(jsDoc?.comment)
      ?.replace(/\r\n(?:\r\n)+/g, "\n\n")
      .replace(/\r\n/g, " "),
  })

  const tagToKeywordValuePair = (
    type: JsonSchema.ValueType,
    tag: ts.JSDocTag,
    parseNumeric: (value: string) => number = Number.parseInt
  ) => {
    const keyword = tag.tagName.escapedText.toString() as JsonSchema.ConstraintKey
    const value = tag.comment?.toString() ?? ""

    if (JsonSchema.constraintsByJsonSchemaType[type].includes(keyword)) {
      return [ keyword, JsonSchema.parseKeywordValue(keyword, value, parseNumeric) ]
    }
  }

  export const toConstraints = (
    jsDoc: ts.JSDoc | undefined,
    type: JsonSchema.ValueType,
    parseNumeric: (value: string) => number = Number.parseInt
  ) => Object.fromEntries(
    jsDoc?.tags?.flatMap(tag => {
      const keywordValuePair = tagToKeywordValuePair(type, tag, parseNumeric)

      return keywordValuePair ? [keywordValuePair] : []
    }) ?? []
  )
}

namespace TypeScriptToJsonSchema {
  const propertyNameToString = (propertyName: ts.PropertyName) =>
    ts.isComputedPropertyName(propertyName)
    ? propertyName.expression.getText()
    : propertyName.text

  const toJsonSchemaObject = (
    node: ts.InterfaceDeclaration | ts.TypeLiteralNode,
    jsDoc: ts.JSDoc | undefined
  ): JsonSchema.Definition => {
    const firstMember = node.members[0]

    if (node.members.length === 1 && firstMember && ts.isIndexSignatureDeclaration(firstMember)) {
      const jsDocIndex = JSDoc.ofNode(firstMember)

      const propertyPattern = jsDocIndex?.tags?.find(tag => tag.tagName.escapedText === "patternProperties")

      const value = toJsonSchemaType(firstMember.type)

      if (propertyPattern !== undefined) {
        return {
          ...JSDoc.toAnnotations(jsDoc),
          type: "object",
          patternProperties: {
            [propertyPattern.comment?.toString() ?? ""]: value
          },
          ...JSDoc.toConstraints(jsDoc, "object"),
          additionalProperties: false
        }
      }
      else {
        return {
          ...JSDoc.toAnnotations(jsDoc),
          type: "object",
          additionalProperties: value,
          ...JSDoc.toConstraints(jsDoc, "object")
        }
      }
    }
    else if (node.members.every(ts.isPropertySignature)) {
      const properties = (node.members as readonly ts.PropertySignature[]).map(
        member => {
          return {
            name: propertyNameToString(member.name),
            required: member.questionToken === undefined,
            value: toJsonSchemaType(member.type!)
          }
        }
      )

      return {
        ...JSDoc.toAnnotations(jsDoc),
        type: "object",
        properties: Object.fromEntries(properties.map(({ name, value }) => [name, value])),
        required: properties.filter(prop => prop.required).map(({ name }) => name),
        additionalProperties: false
      }
    }
    else {
      throw new Error("Mixing index signatures and concrete properties is currently unsupported");
    }
  }

  const toJsonSchemaPrimitive = (node: ts.Node): JsonSchema.Definition => {
    const jsDoc = JSDoc.ofNode(node.parent)

    switch (node.kind) {
      case ts.SyntaxKind.NumberKeyword: {
        const isInteger = jsDoc?.tags?.some(tag => tag.tagName.escapedText === "integer")

        const parseNumeric = isInteger ? Number.parseInt : Number.parseFloat

        return {
          ...JSDoc.toAnnotations(jsDoc),
          type: isInteger ? "integer" : "number",
          ...JSDoc.toConstraints(jsDoc, "number", parseNumeric)
        }
      }

      case ts.SyntaxKind.StringKeyword: {
        return {
          ...JSDoc.toAnnotations(jsDoc),
          type: "string",
          ...JSDoc.toConstraints(jsDoc, "string")
        }
      }

      case ts.SyntaxKind.BooleanKeyword: {
        return {
          ...JSDoc.toAnnotations(jsDoc),
          type: "boolean"
        }
      }

      default:
        // @ts-expect-error
        return { type: "UNKNOWN TOKEN" }
    }
  }

  const toJsonSchemaArray = (node: ts.ArrayTypeNode): JsonSchema.Definition => {
    const jsDoc = JSDoc.ofNode(node.parent)

    return {
      ...JSDoc.toAnnotations(jsDoc),
      type: "array",
      items: toJsonSchemaType(node.elementType),
      ...JSDoc.toConstraints(jsDoc, "array")
    }
  }

  const toJsonSchemaLiteral = (node: ts.LiteralTypeNode): JsonSchema.Definition => {
    const jsDoc = JSDoc.ofNode(node.parent)

    if (ts.isStringLiteral(node.literal)) {
      return {
        ...JSDoc.toAnnotations(jsDoc),
        const: node.literal.text
      }
    }
    else {
      // @ts-expect-error
      return { type: "UNKNOWN LITERAL TYPE" }
    }
  }

  const toJsonSchemaUnion = (node: ts.UnionTypeNode): JsonSchema.Definition => {
    const jsDoc = JSDoc.ofNode(node.parent)

    return {
      ...JSDoc.toAnnotations(jsDoc),
      oneOf: node.types.map(toJsonSchemaType)
    }
  }

  const toJsonSchemaReference = (node: ts.TypeReferenceNode): JsonSchema.Definition => {
    const jsDoc = JSDoc.ofNode(node.parent)

    const name = ts.isIdentifier(node.typeName)
      ? node.typeName.escapedText.toString()
      : node.typeName.right.escapedText.toString()

    // const refSymbol = checker.getSymbolAtLocation(node.typeName)

    // const type = refSymbol && checker.getTypeOfSymbolAtLocation(refSymbol, node)

    // const type = checker.getTypeAtLocation(node.typeName)

    // const symbol = type.getSymbol()

    // const aliasedSymbol = symbol && checker.alias(symbol)

    // const sourceFiles = symbol
    //   ?.declarations
    //   ?.map(decl => decl.getSourceFile())
    //   ?? []

    const currentSourceFile = node.getSourceFile()

    const importNodes = currentSourceFile.statements.filter(ts.isImportDeclaration)

    const matchingImportNode = importNodes.find(importNode => {
      const namedBindings = importNode.importClause?.namedBindings

      if (namedBindings && ts.isNamedImports(namedBindings)) {
        return namedBindings.elements.some(namedBinding => namedBinding.name.escapedText === name)
      }
      else {
        return false
      }
    })

    const externalRelativeFilePath = matchingImportNode?.moduleSpecifier.getText().replace(/^["'](.+)["']$/, "$1")

    // const externalAbsoluteFilePath = externalRelativeFilePath !== undefined
    //   ? resolve(currentSourceFile.fileName, externalRelativeFilePath).split(sep).join("/")
    //   : undefined

    const externalFile = externalRelativeFilePath !== undefined
      ? `${externalRelativeFilePath}.schema.json`
      : ""

    return {
      ...JSDoc.toAnnotations(jsDoc),
      $ref: `${externalFile}#/definitions/${name}`
    }
  }

  const toJsonSchemaEnum = (node: ts.EnumDeclaration) => {
    const jsDoc = JSDoc.ofNode(node)

    return {
      ...JSDoc.toAnnotations(jsDoc),
      enum: node.members.flatMap((member): (string | number)[] => {
        if (member.initializer) {
          if (ts.isStringLiteral(member.initializer)) {
            return [ member.initializer.text ]
          }
          else if (ts.isNumericLiteral(member.initializer)) {
            return [ Number.parseFloat(member.initializer.text) ]
          }
          else {
            return []
          }
        }
        else {
          return []
        }
      })
    }
  }

  const toJsonSchemaType = (node: ts.Node): JsonSchema.Definition => {
    if (ts.isTypeAliasDeclaration(node)) {
      return toJsonSchemaType(node.type)
    }
    else if (ts.isInterfaceDeclaration(node)) {
      return toJsonSchemaObject(node, JSDoc.ofNode(node))
    }
    else if (ts.isEnumDeclaration(node)) {
      return toJsonSchemaEnum(node)
    }
    else if (ts.isTypeLiteralNode(node)) {
      return toJsonSchemaObject(node, JSDoc.ofNode(node.parent))
    }
    else if (ts.isToken(node)) {
      return toJsonSchemaPrimitive(node)
    }
    else if (ts.isUnionTypeNode(node)) {
      return toJsonSchemaUnion(node)
    }
    else if (ts.isTypeReferenceNode(node)) {
      return toJsonSchemaReference(node)
    }
    else if (ts.isArrayTypeNode(node)) {
      return toJsonSchemaArray(node)
    }
    else if (ts.isLiteralTypeNode(node)) {
      return toJsonSchemaLiteral(node)
    }
    else {
      console.log(node)
      // @ts-expect-error
      return { type: "UNKNOWN" }
    }
  }

  const getModuleJsDoc = (file: ts.SourceFile) => {
    const firstNode = file.statements[0]

    if (firstNode) {
      if (ts.isImportDeclaration(firstNode)) {
        return JSDoc.ofNode(firstNode)
      }
      else {
        const jsDocs = firstNode.getChildren().filter(ts.isJSDoc)

        return jsDocs.length > 1 ? jsDocs[0] : undefined
      }
    }
  }

  const getDefinitionName = (statement: ts.Node) => {
    if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isEnumDeclaration(statement)) {
      return statement.name.escapedText.toString()
    }
    else {
      throw new Error("No reference name for node available");
    }
  }

  export const convertFile = (file: ts.SourceFile, schemaFileName: string): JsonSchema.Base => {
    const jsDoc = getModuleJsDoc(file)

    const definitions = Object.fromEntries(
      file
        .statements
        .filter(node =>
          ts.isInterfaceDeclaration(node)
          || ts.isTypeAliasDeclaration(node)
          || ts.isEnumDeclaration(node)
        )
        .map(statement => [
          getDefinitionName(statement),
          toJsonSchemaType(statement)
        ])
    )

    const mainType = ts.getTextOfJSDocComment(jsDoc?.tags?.find(tag => tag.tagName.escapedText === "main")?.comment)

    return {
      $schema: "http://json-schema.org/draft-07/schema",
      $id: schemaFileName,
      $ref: mainType ? `#/definitions/${mainType}` : mainType,
      definitions
    }
  }
}

namespace JsonSchemaToMarkdown {
  const refToParts = (ref: string) => {
    const groups = /^(?:(?<external>.+)\.schema\.json)?#\/definitions\/(?<id>\w+)$/.exec(ref)?.groups

    if (groups && groups.id) {
      return {
        external: groups.external,
        id: groups.id
      }
    }
    else {
      throw new Error(`Json Schema $ref "${ref}" has no id`);
    }
  }

  const resolveDefinition = (schema: JsonSchema.Base, ref: string): JsonSchema.Definition | undefined => {
    const resolvedRef = refToParts(ref)

    if (resolvedRef.external !== undefined) {
      return undefined
    }
    else {
      const definition = schema.definitions[resolvedRef.id]

      if (definition) {
        if (JsonSchema.isReference(definition)) {
          return resolveDefinition(schema, definition.$ref)
        }
        else {
          return definition
        }
      }
      else {
        return undefined
      }
    }
  }

  const h = (level: number, text: string, anchor?: string) => {
    const safeLevel = level < 1 ? 1 : level > 6 ? 6 : level
    const anchorElement = anchor === undefined ? "" : ` <a name="${anchor}"></a>`

    return `${"#".repeat(safeLevel)}${anchorElement} ${text}`
  }

  const a = (text: string, href: string) => `<a href="${href}">${text}</a>`

  const docHeader = (schema: JsonSchema.Base, ref: JsonSchema.Annotated | undefined) => {
    const title = ref?.title ?? schema.title ?? "[TITLE MISSING]"
    const description = ref?.description ?? schema.description

    return headerWithDescription(h(1, title), description)
  }

  const definitionHeader = (id: string, node: JsonSchema.Annotated) => {
    return headerWithDescription(h(3, node.title ?? id, id), node.description)
  }

  const headerWithDescription = (title: string, description: string | undefined) => {
    if (description === undefined) {
      return title
    }

    return `${title}\n\n${description}`
  }

  namespace LabelledList {
    type KeyConfig<T extends object, K extends keyof T> = false | {
      label: string,
      transform?: (value: T[K] extends undefined ? never : T[K]) => string | number | boolean
    }

    export type Config<T extends object> = {
      [K in keyof T]-?: KeyConfig<T, K>
    }

    export type AdditionalConfig = {
      indent?: number
      prepend?: { [label: string]: string }
      append?: { [label: string]: string }
    }

    export const line = (label: string, value: string | number | boolean, indent = 0) =>
      `${" ".repeat(indent)}- **${label}:** ${value}`

    export const create = <T extends object>(
      obj: T,
      config: Config<T>,
      { indent = 0, prepend = {}, append = {} }: AdditionalConfig = {}
    ) => {
      return [
        ...Object.entries(prepend)
          .map(([label, value]) => line(label, value, indent)),
        ...Object.entries(obj)
          .flatMap(([key, value]) => {
            const keyConfig = (config as { [key: string]: KeyConfig<T, keyof T> })[key]

            if (keyConfig && value !== undefined) {
              const transformedValue = keyConfig.transform
                ? keyConfig.transform(value as T[keyof T] extends undefined ? never : T[keyof T])
                : value

              return [line(keyConfig.label, transformedValue, indent)]
            }
            else {
              return []
            }
          }),
        ...Object.entries(append)
          .map(([label, value]) => line(label, value, indent))
      ]
        .join("\n")
    }
  }

  const simpleBody = (
    node: JsonSchema.Simple
  ): string => {
    if (JsonSchema.isNumber(node)) {
      return LabelledList.create(node, {
        title: false,
        description: false,
        type: { label: "Type", transform: value => value === "integer" ? "Integer" : "Number" },
        minimum: { label: "Minimum", transform: value => `\`${value}\`` },
        maximum: { label: "Maximum", transform: value => `\`${value}\`` },
      })
    }
    else if (JsonSchema.isString(node)) {
      return LabelledList.create(node, {
        title: false,
        description: false,
        type: { label: "Type", transform: () => "String" },
        minLength: { label: "Minimum Length", transform: value => `\`${value}\`` },
        maxLength: { label: "Maximum Length", transform: value => `\`${value}\`` },
        format: { label: "Format", transform: value => `\`${value}\`` },
        pattern: { label: "Pattern", transform: value => `\`${value}\`` },
      })
    }
    else if (JsonSchema.isBoolean(node)) {
      return LabelledList.create(node, {
        title: false,
        description: false,
        type: { label: "Type", transform: () => "Boolean" },
      })
    }
    else if (JsonSchema.isConstant(node)) {
      return LabelledList.create(node, {
        title: false,
        description: false,
        const: { label: "Constant", transform: value => `\`${JSON.stringify(value)}\`` },
      })
    }
    else if (JsonSchema.isReference(node)) {
      return LabelledList.create(node, {
        title: false,
        description: false,
        $ref: {
          label: "Type",
          transform: ref => {
            const { id, external } = refToParts(ref)

            return a(id, `${external ? `${external}.md` : ""}#${id}`)
          }
        },
      })
    }
    else if (JsonSchema.isEnum(node)) {
      return LabelledList.create(node, {
        title: false,
        description: false,
        enum: {
          label: "Possible values",
          transform: values => values
            .map(value => `\`${JSON.stringify(value)}\``)
            .join(", ")
        },
      })
    }
    else {
      throw new Error(`${JSON.stringify(node)} is not primitive`)
    }
  }

  type ResultCollection = {
    paragraphs: string[]
    openDefinitions: {
      propertyPath: string
      definition: JsonSchema.Definition
    }[]
  }

  const arrayBody = (
    node: JsonSchema.Array,
    headingLevel: number,
    propertyPath: string
  ): string[] => {
    return [
      LabelledList.create(node, {
        title: false,
        description: false,
        type: { label: "Type", transform: () => "List" },
        items: false,
        uniqueItems: { label: "Unique Items", transform: value => `\`${value}\`` },
        minItems: { label: "Minimum Items", transform: value => `\`${value}\`` },
        maxItems: { label: "Maximum Items", transform: value => `\`${value}\`` },
      }),
      h(headingLevel + 1, "Items"),
      JsonSchema.isSimple(node.items) ? simpleBody(node.items) : printJson(node.items)
    ]
  }

  const unionBody = (
    node: JsonSchema.Union,
    headingLevel: number,
    propertyPath: string
  ): string[] => {
    const cases = node.oneOf
      .flatMap((childNode, index): string[] => {
        if (JsonSchema.isReference(childNode)) {
          const { id } = refToParts(childNode.$ref)

          return [
            headerWithDescription(
              h(headingLevel + 1, `Case: ${childNode.title ?? id}`),
              childNode.description
            ),
            simpleBody(childNode)
          ]
        }
        else if (JsonSchema.isSimple(childNode)) {
          return [
            headerWithDescription(
              h(headingLevel + 1, `Case: ${childNode.title ?? index.toFixed(0)}`),
              childNode.description
            ),
            simpleBody(childNode)
          ]
        }
        else {
          const id = (() => {
            if (JsonSchema.isStrictObject(childNode)) {
              const tagProperty = childNode.properties["tag"]
              return  tagProperty && JsonSchema.isConstant(tagProperty)
                ? tagProperty.const.toString()
                : index.toFixed(0)
            }
            else {
              return index.toFixed(0)
            }
          })()

          const casePropertyPath = `${propertyPath}\`${index}`

          return [
            headerWithDescription(
              h(headingLevel + 1, `Case: ${childNode.title ?? id}`),
              childNode.description
            ),
            ...definitionBody(childNode, headingLevel + 1, casePropertyPath)
          ]
        }
      })

    return [
      LabelledList.create(node, {
        title: false,
        description: false,
        oneOf: { label: "Type", transform: () => "Union"}
      }),
      ...cases
    ]
  }

  const dictionaryBody = (
    node: JsonSchema.Dictionary,
    headingLevel: number,
    propertyPath: string
  ): string[] => {
    return [
      LabelledList.create(node, {
        title: false,
        description: false,
        type: { label: "Type", transform: () => "Dictionary" },
        additionalProperties: false,
        minProperties: { label: "Minimum Properties", transform: value => `\`${value}\`` },
      }),
      h(headingLevel + 1, "Values"),
      JsonSchema.isSimple(node.additionalProperties) ? simpleBody(node.additionalProperties) : printJson(node.additionalProperties)
    ]
  }

  const patternDictionaryBody = (
    node: JsonSchema.PatternDictionary,
    headingLevel: number,
    propertyPath: string
  ): string[] => {
    return [
      LabelledList.create(node, {
        title: false,
        description: false,
        type: { label: "Type", transform: () => "Dictionary" },
        patternProperties: { label: "Patterns", transform: value => Object.keys(value).map(pattern => `\`${pattern}\``).join(", ") },
        minProperties: { label: "Minimum Properties", transform: value => `\`${value}\`` },
        additionalProperties: false,
      }),
      ...Object.entries(node.patternProperties).flatMap(([pattern, propertyNode]) => {
        return [
          h(headingLevel + 1, `Values matching \`${pattern}\``),
          JsonSchema.isSimple(propertyNode) ? simpleBody(propertyNode) : printJson(propertyNode)
        ]
      })
    ]
  }

  const nonStrictObject = (node: JsonSchema.NonStrictObject, headingLevel: number, propertyPath: string): string[] => {
    if (JsonSchema.isSimple(node)) {
      return [simpleBody(node)]
    }
    else if (JsonSchema.isArray(node)) {
      return arrayBody(node, headingLevel, propertyPath)
    }
    else if (JsonSchema.isUnion(node)) {
      return unionBody(node, headingLevel, propertyPath)
    }
    else if (JsonSchema.isDictionary(node)) {
      return dictionaryBody(node, headingLevel, propertyPath)
    }
    else if (JsonSchema.isPatternDictionary(node)) {
      return patternDictionaryBody(node, headingLevel, propertyPath)
    }
    else {
      return []
    }
  }

  const strictObjectBody = (
    node: JsonSchema.StrictObject,
    headingLevel: number,
    propertyPath: string
  ): string[] => {
    const propertiesOverview = Object.entries(node.properties)
      .map(([key, propertyNode]) => {
        const propertyPropertyPath = `${propertyPath}/${key}`
        const title = `\`${key}${node.required.includes(key) ? "" : "?"}\``

        return [
          title,
          propertyNode.description ?? "",
          a("See details", `#${propertyPropertyPath}`)
        ].join(" | ")
      })
      .join("\n")

    const properties = Object.entries(node.properties)
      .flatMap(([key, propertyNode]): string[] => {
        const propertyPropertyPath = `${propertyPath}/${key}`
        const title = h(headingLevel + 1, `\`${key}${node.required.includes(key) ? "" : "?"}\``, propertyPropertyPath)

        if (JsonSchema.isStrictObject(propertyNode)) {
          return [
            headerWithDescription( title, propertyNode.description ),
            printJson(propertyNode)
          ]
        }
        else {
          return [
            headerWithDescription( title, propertyNode.description ),
            ...nonStrictObject(propertyNode, headingLevel + 1, propertyPropertyPath)
          ]
        }
      })

    return [
      LabelledList.create(node, {
        title: false,
        description: false,
        type: { label: "Type", transform: () => "Object" },
        properties: false,
        required: false,
        additionalProperties: false,
      }),
      `Key | Description | Details\n:-- | :-- | :--\n${propertiesOverview}`,
      ...properties
    ]
  }

  const printJson = (json: any) => `\`\`\`json\n${JSON.stringify(json, undefined, 2)}\n\`\`\``

  const definitionBody = (node: JsonSchema.Definition, headingLevel: number, propertyPath: string): string[] => {
    if (JsonSchema.isStrictObject(node)) {
      return strictObjectBody(node, headingLevel, propertyPath)
    }
    else {
      return nonStrictObject(node, headingLevel, propertyPath)
    }
  }

  const definitionToMarkdown = (id: string, node: JsonSchema.Definition, headingLevel: number) => {
    const header = definitionHeader(id, node)
    const body = definitionBody(node, headingLevel, id)

    return [
      header,
      ...body
    ]
  }

  export const convertSchema = (schema: JsonSchema.Base) => {
    const ref = schema.$ref !== undefined ? resolveDefinition(schema, schema.$ref) : undefined

    const definitions = Object.entries(schema.definitions)
      .flatMap(([id, definition], i, arr) =>
        arr.length > i + 1
          ? [
            ...definitionToMarkdown(id, definition, 3),
            "---"
          ]
          : definitionToMarkdown(id, definition, 3)
      )

    return [
      docHeader(schema, ref),
      h(2, "Definitions"),
      ...definitions
    ].join("\n\n")
  }
}

const getOptionValue = (name: string) => {
  const index = process.argv.indexOf(name)

  if (index > -1) {
    return process.argv[index + 1]
  }
}

const tsDir = getOptionValue("--tsdir")
const jsonSchemaDir = getOptionValue("--jsondir")
const mdDir = getOptionValue("--mddir")

if (!tsDir || !jsonSchemaDir || !mdDir) {
  console.log(`\
Usage:

node -r ts-node/register/transpile-only createSchema.ts --tsdir "src/entity" --jsondir "json" --mddir "docs"`)
}
else {
  const prepareArgumentPath = (path: string) =>
    join(__dirname, "..", path.split(/[\/\\]/).join(sep))

  const prepareArgumentPathSplit = (path: string) =>
    prepareArgumentPath(path).split(sep)

  const rootPaths = prepareArgumentPath(tsDir)

  const dirEntryToFilePath = (dirEntry: Dirent) =>
    join(rootPaths, dirEntry.name).split(sep).join("/")

  const tsFiles = readdirSync(rootPaths, { withFileTypes: true })
    .flatMap(dirEntry => {
      if (dirEntry.isFile() && extname(dirEntry.name) === ".ts") {
        return [dirEntryToFilePath(dirEntry)]
      }
      else {
        return []
      }
    })

  const program = ts.createProgram(tsFiles, { strict: true })

  // KEEP, SIDE EFFECT: it fills the parent references of nodes
  program.getTypeChecker()

  const jsonSchemaRoot = prepareArgumentPathSplit(jsonSchemaDir)
  const markdownRoot = prepareArgumentPathSplit(mdDir)

  mkdirSync(jsonSchemaRoot.join(sep), { recursive: true })
  mkdirSync(markdownRoot.join(sep), { recursive: true })

  program
    .getSourceFiles()
    .filter(file => tsFiles.includes(file.fileName))
    // .filter(file => file.fileName.includes("State.ts"))
    .forEach(file => {
      const schemaFilePath = [...jsonSchemaRoot, `${basename(file.fileName, ".ts")}.schema.json`]
      const markdownFilePath = [...markdownRoot, `${basename(file.fileName, ".ts")}.md`]

      const schema = TypeScriptToJsonSchema.convertFile(file, schemaFilePath.join("/"))
      const docs = JsonSchemaToMarkdown.convertSchema(schema)

      writeFileSync(schemaFilePath.join(sep), JSON.stringify(schema, undefined, 2))
      writeFileSync(markdownFilePath.join(sep), docs)
    })
}
