import { EOL } from "os"
import { ArrayNode, ChildNode, DictionaryNode, EnumerationNode, JSDoc, LiteralNode, NodeKind, parentGroupToArray, RecordNode, ReferenceNode, RootNode, TokenKind, TokenNode, TupleNode, UnionNode } from "./ast"

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
  return headerWithDescription(
    h(3, jsDoc?.tags.title ? `${jsDoc?.tags.title} (\`${id}\`)` : `\`${id}\``, id),
    jsDoc?.comment
  )
}

const headerWithDescription = (title: string, description: string | undefined) => {
  if (description === undefined) {
    return title
  }

  return `${title}${EOL}${EOL}${description}`
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
    items.filter(item => item !== undefined).join(EOL)
}

type SimpleNode =
  | TokenNode
  | LiteralNode
  | ReferenceNode
  | EnumerationNode

const simpleBody = (node: SimpleNode): string => {
  switch (node.kind) {
    case NodeKind.Token: {
      switch (node.token) {
        case TokenKind.Number: {
          return LabelledList.create([
            LabelledList.line("Type", node.jsDoc?.tags.integer ?? false, value => value ? "Integer" : "Number"),
            LabelledList.line("Minimum", node.jsDoc?.tags.minimum, icode),
            LabelledList.line("Exclusive Minimum", node.jsDoc?.tags.exclusiveMinimum, icode),
            LabelledList.line("Maximum", node.jsDoc?.tags.maximum, icode),
            LabelledList.line("Exclusive Maximum", node.jsDoc?.tags.exclusiveMaximum, icode),
            LabelledList.line("Multiple of", node.jsDoc?.tags.multipleOf, icode),
          ])
        }
        case TokenKind.String: {
          return LabelledList.create([
            LabelledList.line("Type", node.jsDoc?.tags.markdown ?? false, value => value ? "Markdown-formatted text" : "String"),
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
          ({ name, parentGroup, externalFilePath }) => {
            const fullQualifiedName = [...parentGroupToArray(parentGroup), name].join("/")

            return a(
              fullQualifiedName,
              `${externalFilePath ? `${externalFilePath}.md` : ""}#${fullQualifiedName}`
            )
          }
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

type SectionNode = {
  inline: string[]
  append: SectionNode[]
}

const mergeParagraphs = ({ inline, append }: SectionNode): string[] =>
  [ ...inline, ...append.flatMap(mergeParagraphs) ]

const arrayBody = (
  node: ArrayNode,
  propertyPath: string
): SectionNode => {
  const itemsPropertyPath = `${propertyPath}[]`

  return {
    inline: [
      LabelledList.create([
        LabelledList.line("Type", "List"),
        LabelledList.line("Items", itemsPropertyPath, anchor => a(anchor, `#${anchor}`)),
        LabelledList.line("Minimum Items", node.jsDoc?.tags.minItems, icode),
        LabelledList.line("Maximum Items", node.jsDoc?.tags.maxItems, icode),
        LabelledList.line("Unique Items", node.jsDoc?.tags.uniqueItems, boolean),
      ])
    ],
    append: [
      definitionToMarkdown(itemsPropertyPath, node.elements),
    ]
  }
}

const tupleBody = (
  node: TupleNode,
  propertyPath: string
): SectionNode => {
  const indexedPropertyPath = (index: number) => `${propertyPath}[${index}]`

  return {
    inline: [
      LabelledList.create([
        LabelledList.line("Type", "Tuple"),
        LabelledList.line(
          "Items",
          node.elements,
          childNodes => `[${
            childNodes
              .map((_, index) =>
                a(indexedPropertyPath(index), indexedPropertyPath(index)))
              .join(", ")
          }]`
        ),
      ]),
    ],
    append: node.elements.map(
      (childNode, index) =>
        definitionToMarkdown(indexedPropertyPath(index), childNode)
    )
  }
}

const unionBody = (
  node: UnionNode,
  propertyPath: string
): SectionNode => {
  const id = (childNode: ChildNode, index: number) => {
    switch (childNode.kind) {
      case NodeKind.Record: {
        const tagProperty = childNode.elements["tag"]

        return tagProperty && tagProperty.value.kind === NodeKind.Literal
          ? tagProperty.value.value.toString()
          : index.toFixed(0)
      }

      case NodeKind.Reference: {
        return childNode.name
      }

      default: {
        return index.toFixed(0)
      }
    }
  }

  const casePropertyPath = (caseId: string) => `${propertyPath}'${caseId}`

  return {
    inline: [
      LabelledList.create([
        LabelledList.line("Type", "Union"),
        LabelledList.line(
          "Cases",
          node.cases,
          cases =>
            cases
              .map((childNode, index) => {
                const caseId = casePropertyPath(id(childNode, index))

                return a(caseId, caseId)
              })
              .join(" | ")
        ),
      ])
    ],
    append: node.cases.map(
      (childNode, index) =>
        definitionToMarkdown(casePropertyPath(id(childNode, index)), childNode)
    )
  }
}

const dictionaryBody = (
  node: DictionaryNode,
  propertyPath: string
): SectionNode => {
  const itemsPropertyPath = `${propertyPath}[key]`

  return {
    inline: [
      LabelledList.create([
        LabelledList.line("Type", "Dictionary"),
        LabelledList.line("Property Values", itemsPropertyPath, anchor => a(anchor, `#${anchor}`)),
        LabelledList.line("Pattern", node.pattern, icode),
        LabelledList.line("Minimum Properties", node.jsDoc?.tags.minProperties, icode),
      ]),
    ],
    append: [
      definitionToMarkdown(itemsPropertyPath, node.elements),
    ]
  }
}

const strictObjectBody = (
  node: RecordNode,
  propertyPath: string
): SectionNode => {
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
    .join(EOL)

  const properties = Object.entries(node.elements)
    .reduce<SectionNode>(
      (
        {
          inline,
          append,
        },
        [key, propertyNode]
      ) => {
        const propertyPropertyPath = `${propertyPath}/${key}`
        const title = h(4, `\`${key}${propertyNode.required ? "" : "?"}\``, propertyPropertyPath)

        if (propertyNode.value.kind === NodeKind.Record) {
          return {
            inline: [
              ...inline,
              headerWithDescription(title, propertyNode.jsDoc?.comment),
              LabelledList.create([
                LabelledList.line("Type", propertyPropertyPath, anchor => a("Object", `#${anchor}`)),
              ]),
            ],
            append: [
              ...append,
              definitionToMarkdown(propertyPropertyPath, propertyNode.value)
            ],
          }
        }
        else {
          const { inline: inlineCurrent, append: appendCurrent } = definitionToMarkdown(
            propertyPropertyPath,
            propertyNode.value,
            true,
            headerWithDescription(title, propertyNode.jsDoc?.comment)
          )

          return {
            inline: [
              ...inline,
              ...inlineCurrent,
            ],
            append: [
              ...append,
              ...appendCurrent
            ],
          }
        }
      },
      {
        inline: [],
        append: [],
      }
    )

  return {
    inline: [
      LabelledList.create([
        LabelledList.line("Type", "Object"),
        LabelledList.line("Minimum Properties", node.jsDoc?.tags.minProperties, icode),
      ]),
      `Key | Description | Details${EOL}:-- | :-- | :--${EOL}${propertiesOverview}`,
      ...properties.inline,
    ],
    append: properties.append
  }
}

const prependHeader = (
  propertyPath: string,
  node: ChildNode,
  skipLine: boolean,
  header: string | undefined,
  { inline, append }: SectionNode,
) =>
  ({
    inline: [
      ...(!skipLine ? ["---"] : []),
      header ?? definitionHeader(propertyPath, node.jsDoc),
      ...inline
    ],
    append
  })

const definitionToMarkdown = (
  propertyPath: string,
  node: ChildNode,
  skipLine = false,
  header?: string
): SectionNode => {
  switch (node.kind) {
    case NodeKind.Token:
    case NodeKind.Literal:
    case NodeKind.Reference:
    case NodeKind.Enumeration: {
      return prependHeader(propertyPath, node, skipLine, header, {
        inline: [simpleBody(node)],
        append: []
      })
    }
    case NodeKind.Record: {
      return prependHeader(propertyPath, node, skipLine, header,
        strictObjectBody(node, propertyPath))
    }
    case NodeKind.Array: {
      return prependHeader(propertyPath, node, skipLine, header,
        arrayBody(node, propertyPath))
    }
    case NodeKind.Union: {
      return prependHeader(propertyPath, node, skipLine, header,
        unionBody(node, propertyPath))
    }
    case NodeKind.Dictionary: {
      return prependHeader(propertyPath, node, skipLine, header,
        dictionaryBody(node, propertyPath))
    }
    case NodeKind.Tuple: {
      return prependHeader(propertyPath, node, skipLine, header,
        tupleBody(node, propertyPath))
    }
    case NodeKind.Group: {
      return {
        inline: [],
        append: Object.entries(node.elements)
          .map(([key, childNode], i) =>
            definitionToMarkdown(`${propertyPath}/${key}`, childNode, skipLine && i === 0)
          )
      }
    }
  }
}

const logr = <T>(x: T): T => (console.log(JSON.stringify(x, undefined, 2)), x)

export const astToMarkdown = (file: RootNode): string => {
  const ref = file.jsDoc?.tags.main !== undefined ? file.elements[file.jsDoc?.tags.main] : undefined

  const definitions = Object.entries(file.elements)
    .map(([id, definition], i) =>
      definitionToMarkdown(id, definition, i === 0)
    )
    .flatMap(mergeParagraphs)

  return [
    docHeader(file, ref?.jsDoc),
    h(2, "Definitions"),
    ...definitions
  ].join(EOL + EOL) + EOL
}
