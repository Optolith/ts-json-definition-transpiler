import { ArrayNode, ChildNode, DictionaryNode, EnumerationNode, JSDoc, LiteralNode, NodeKind, RecordNode, ReferenceNode, RootNode, TokenKind, TokenNode, TupleNode, UnionNode } from "./ast"

const h = (level: number, text: string, anchor?: string) => {
  const safeLevel = level < 1 ? 1 : level > 6 ? 6 : level
  const anchorElement = anchor === undefined ? "" : ` <a name="${anchor}"></a>`

  return `${"#".repeat(safeLevel)}${anchorElement} ${text}`
}

const a = (text: string, href: string) => `<a href="${href}">${text}</a>`

const icode = (code: string | number | boolean) => `\`${code}\``

const icodejson = (code: string | number | boolean) => `\`${JSON.stringify(code)}\``

const boolean = (boolean: boolean) => boolean ? "Yes" : "No"

const docHeader = (schema: RootNode, jsDoc: JSDoc.Type | undefined) => {
  const title = jsDoc?.tags.title ?? schema.jsDoc?.tags.title ?? "[TITLE MISSING]"
  const description = jsDoc?.comment ?? schema.jsDoc?.comment

  return headerWithDescription(h(1, title), description)
}

const definitionHeader = (id: string, jsDoc: JSDoc.Type | undefined) => {
  return headerWithDescription(h(3, jsDoc?.tags.title ?? id, id), jsDoc?.comment)
}

const headerWithDescription = (title: string, description: string | undefined) => {
  if (description === undefined) {
    return title
  }

  return `${title}\n\n${description}`
}

namespace LabelledList {
  type Config = {
    indent?: number
  }

  const linemd = (label: string, value: any, indent = 0) =>
    `${" ".repeat(indent)}- **${label}:** ${value}`

  const isNonNullable = <T>(x: T): x is NonNullable<T> => x != null

  export const line = <T>(
    label: string,
    value: T | undefined,
    transform?: (value: NonNullable<T>) => string | number | boolean,
    config: Config = {}
  ) =>
    isNonNullable (value)
    ? transform
      ? linemd(label, transform(value), config.indent)
      : linemd(label, value, config.indent)
    : undefined

  export const create = (items: (string | undefined)[]) =>
    items.filter(item => item !== undefined).join("\n")
}

type SimpleNode =
  | TokenNode
  | LiteralNode
  | ReferenceNode
  | EnumerationNode

const isSimpleNode = (node: ChildNode): node is SimpleNode =>
  node.kind === NodeKind.Token
  || node.kind === NodeKind.Literal
  || node.kind === NodeKind.Reference
  || node.kind === NodeKind.Enumeration

const simpleBody = (node: SimpleNode): string => {
  switch (node.kind) {
    case NodeKind.Token: {
      switch (node.token) {
        case TokenKind.Number: {
          return LabelledList.create([
            LabelledList.line("Type", node.jsDoc?.tags.integer, value => value ? "Integer" : "Number"),
            LabelledList.line("Minimum", node.jsDoc?.tags.minimum, icode),
            LabelledList.line("Maximum", node.jsDoc?.tags.maximum, icode),
          ])
        }
        case TokenKind.String: {
          return LabelledList.create([
            LabelledList.line("Type", "String"),
            LabelledList.line("Minimum Length", node.jsDoc?.tags.minLength, icode),
            LabelledList.line("Maximum Length", node.jsDoc?.tags.maxLength, icode),
            LabelledList.line("Format", node.jsDoc?.tags.format, icode),
            LabelledList.line("Pattern", node.jsDoc?.tags.pattern, icode),
          ])
        }
        case TokenKind.Boolean: {
          return LabelledList.create([
            LabelledList.line("Type", "Boolean"),
          ])
        }
      }
    }
    case NodeKind.Literal: {
      return LabelledList.create([
        LabelledList.line("Constant", node.value, icodejson),
      ])
    }
    case NodeKind.Reference: {
      return LabelledList.create([
        LabelledList.line(
          "Type",
          node,
          ({ name, parentGroups, externalFilePath }) => a(
            name,
            `${externalFilePath ? `${externalFilePath}.md` : ""}#${[...parentGroups, name].join("/")}`
          )
        ),
      ])
    }
    case NodeKind.Enumeration: {
      return LabelledList.create([
        LabelledList.line(
          "Possible values",
          node.cases,
          cases => cases
            .map(value => value.value)
            .map(icodejson)
            .join(", ")
        ),
      ])
    }
  }
}

const arrayBody = (
  node: ArrayNode,
  headingLevel: number,
  propertyPath: string
): string[] => {
  return [
    LabelledList.create([
      LabelledList.line("Type", "List"),
      LabelledList.line("Minimum Items", node.jsDoc?.tags.minItems, icode),
      LabelledList.line("Maximum Items", node.jsDoc?.tags.maxItems, icode),
      LabelledList.line("Unique Items", node.jsDoc?.tags.uniqueItems, boolean),
    ]),
    h(headingLevel + 1, "Items"),
    isSimpleNode(node.elements) ? simpleBody(node.elements) : printJson(node.elements)
  ]
}

const tupleBody = (
  node: TupleNode,
  headingLevel: number,
  propertyPath: string
): string[] => {
  return [
    LabelledList.create([
      LabelledList.line("Type", "Tuple"),
    ]),
    ...node.elements.flatMap((childNode, index) => {
      if (isSimpleNode(childNode)) {
        return [
          headerWithDescription(
            h(headingLevel + 1, `Index ${index}`),
            childNode.jsDoc?.comment
          ),
          simpleBody(childNode)
        ]
      }
      else {
        return [
          headerWithDescription(
            h(headingLevel + 1, `Index ${index}`),
            childNode.jsDoc?.comment
          ),
          ...definitionBody(childNode, headingLevel + 1, `${propertyPath}\`${index}`)
        ]
      }
    })
  ]
}

const unionBody = (
  node: UnionNode,
  headingLevel: number,
  propertyPath: string
): string[] => {
  const cases = node.cases
    .flatMap((childNode, index): string[] => {
      if (childNode.kind === NodeKind.Reference) {
        return [
          headerWithDescription(
            h(headingLevel + 1, `Case: ${childNode.jsDoc?.tags.title ?? childNode.name}`),
            childNode.jsDoc?.comment
          ),
          simpleBody(childNode)
        ]
      }
      else if (isSimpleNode(childNode)) {
        return [
          headerWithDescription(
            h(headingLevel + 1, `Case: ${childNode.jsDoc?.tags.title ?? index.toFixed(0)}`),
            childNode.jsDoc?.comment
          ),
          simpleBody(childNode)
        ]
      }
      else {
        const id = (() => {
          if (childNode.kind === NodeKind.Record) {
            const tagProperty = childNode.elements["tag"]
            return tagProperty && tagProperty.value.kind === NodeKind.Literal
              ? tagProperty.value.value.toString()
              : index.toFixed(0)
          }
          else {
            return index.toFixed(0)
          }
        })()

        const casePropertyPath = `${propertyPath}\`${index}`

        return [
          headerWithDescription(
            h(headingLevel + 1, `Case: ${childNode.jsDoc?.tags.title ?? id}`),
            childNode.jsDoc?.comment
          ),
          ...definitionBody(childNode, headingLevel + 1, casePropertyPath)
        ]
      }
    })

  return [
    LabelledList.create([
      LabelledList.line("Type", "Union"),
    ]),
    ...cases
  ]
}

const dictionaryBody = (
  node: DictionaryNode,
  headingLevel: number,
  propertyPath: string
): string[] => {
  return [
    LabelledList.create([
      LabelledList.line("Type", "Dictionary"),
      LabelledList.line("Pattern", node.pattern, icode),
      LabelledList.line("Minimum Properties", node.jsDoc?.tags.minProperties, icode),
    ]),
    h(headingLevel + 1, node.pattern ? `Values matching \`${node.pattern}\`` : "Values"),
    isSimpleNode(node.elements) ? simpleBody(node.elements) : printJson(node.elements)
  ]
}

const nonStrictObject = (node: Exclude<ChildNode, RecordNode>, headingLevel: number, propertyPath: string): string[] => {
  if (isSimpleNode(node)) {
    return [simpleBody(node)]
  }
  else {
    switch (node.kind) {
      case NodeKind.Array: {
        return arrayBody(node, headingLevel, propertyPath)
      }
      case NodeKind.Union: {
        return unionBody(node, headingLevel, propertyPath)
      }
      case NodeKind.Dictionary: {
        return dictionaryBody(node, headingLevel, propertyPath)
      }
      case NodeKind.Tuple: {
        return tupleBody(node, headingLevel, propertyPath)
      }
      case NodeKind.Group: {
        return Object.entries(node.elements)
          .flatMap(([key, childNode]) =>
            definitionBody(childNode, headingLevel, `${propertyPath}/${key}`)
          )
      }
    }
  }
}

const strictObjectBody = (
  node: RecordNode,
  headingLevel: number,
  propertyPath: string
): string[] => {
  const propertiesOverview = Object.entries(node.elements)
    .map(([key, config]) => {
      const propertyPropertyPath = `${propertyPath}/${key}`
      const title = `\`${key}${config.required ? "" : "?"}\``

      return [
        title,
        config.jsDoc?.comment ?? "",
        a("See details", `#${propertyPropertyPath}`)
      ].join(" | ")
    })
    .join("\n")

  const properties = Object.entries(node.elements)
    .flatMap(([key, config]): string[] => {
      const propertyPropertyPath = `${propertyPath}/${key}`
      const title = h(headingLevel + 1, `\`${key}${config.required ? "" : "?"}\``, propertyPropertyPath)

      if (config.value.kind === NodeKind.Record) {
        return [
          headerWithDescription(title, config.jsDoc?.comment),
          printJson(config)
        ]
      }
      else {
        return [
          headerWithDescription(title, config.jsDoc?.comment),
          ...nonStrictObject(config.value, headingLevel + 1, propertyPropertyPath)
        ]
      }
    })

  return [
    LabelledList.create([
      LabelledList.line("Type", "Object"),
      LabelledList.line("Minimum Properties", node.jsDoc?.tags.minProperties, icode),
    ]),
    `Key | Description | Details\n:-- | :-- | :--\n${propertiesOverview}`,
    ...properties
  ]
}

const printJson = (json: any) => `\`\`\`json\n${JSON.stringify(json, undefined, 2)}\n\`\`\``

const definitionBody = (node: ChildNode, headingLevel: number, propertyPath: string): string[] => {
  if (node.kind === NodeKind.Record) {
    return strictObjectBody(node, headingLevel, propertyPath)
  }
  else {
    return nonStrictObject(node, headingLevel, propertyPath)
  }
}

const definitionToMarkdown = (id: string, node: ChildNode, headingLevel: number) => {
  const header = definitionHeader(id, node.jsDoc)
  const body = definitionBody(node, headingLevel, id)

  return [
    header,
    ...body
  ]
}

export const astToMarkdown = (file: RootNode): string => {
  const ref = file.jsDoc?.tags.main !== undefined ? file.elements[file.jsDoc?.tags.main] : undefined

  const definitions = Object.entries(file.elements)
    .flatMap(([id, definition], i, arr) =>
      arr.length > i + 1
        ? [
          ...definitionToMarkdown(id, definition, 3),
          "---"
        ]
        : definitionToMarkdown(id, definition, 3)
    )

  return [
    docHeader(file, ref?.jsDoc),
    h(2, "Definitions"),
    ...definitions
  ].join("\n\n") + "\n"
}
