import { isNotNullish } from "@optolith/helpers/nullable"
import { assertExhaustive } from "@optolith/helpers/typeSafety"
import { EOL } from "node:os"
import {
  ArrayNode,
  ChildNode,
  DictionaryNode,
  Doc,
  EnumerationNode,
  isReferenceNode,
  isTokenNode,
  LiteralNode,
  NodeKind,
  RecordNode,
  ReferenceNode,
  RootNode,
  StatementNode,
  TokenKind,
  TokenNode,
  TupleNode,
  TypeParameterNode,
  UnionNode,
} from "../../ast.js"
import {
  getRightmostQualifiedNameSegment,
  qualifiedNameToArray,
} from "../../utils/qualifiedName.js"
import {
  getAliasedImportName,
  getFullyQualifiedNameAsPath,
  getRelativeExternalPath,
} from "../../utils/references.js"

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const h = (level: number, text: string, anchor?: string) => {
  const safeLevel = clamp(level, 1, 6)
  const anchorElement = anchor === undefined ? "" : ` <a name="${anchor}"></a>`

  return `${"#".repeat(safeLevel)}${anchorElement} ${text}`
}

const a = (text: string, href: string) => `<a href="${href}">${text}</a>`

const anchorUrl = (anchorName: string, fileUrl = "") =>
  `${fileUrl}#${anchorName}`

const icode = (code: string | number | boolean) => `\`${code}\``

const icodejson = (code: unknown | string | number | boolean) =>
  `\`${JSON.stringify(code)}\``

const boolean = (boolean: boolean) => (boolean ? "Yes" : "No")

const docHeader = (schema: RootNode, jsDoc: Doc | undefined) => {
  const title =
    jsDoc?.tags.title ?? schema.jsDoc?.tags.title ?? "[TITLE MISSING]"
  const description = jsDoc?.comment ?? schema.jsDoc?.comment

  return headerWithDescription(h(1, title), description)
}

const definitionHeader = (
  id: string,
  jsDoc: Doc | undefined,
  typeParameters?: TypeParameterNode[]
) => {
  const fullName = typeParameters
    ? `${id}<${typeParameters
        .map((param) => {
          const constraint =
            param.constraint?.kind === NodeKind.Token
              ? param.constraint.token === TokenKind.Number
                ? "Number"
                : param.constraint.token === TokenKind.String
                ? "String"
                : param.constraint.token === TokenKind.Boolean
                ? "Boolean"
                : "..."
              : param.constraint?.kind === NodeKind.Reference
              ? qualifiedNameToArray(param.constraint.name).join("/")
              : param.constraint !== undefined
              ? "..."
              : undefined

          const defaultValue =
            param.default?.kind === NodeKind.Token
              ? param.default.token === TokenKind.Number
                ? "Number"
                : param.default.token === TokenKind.String
                ? "String"
                : param.default.token === TokenKind.Boolean
                ? "Boolean"
                : "..."
              : param.default?.kind === NodeKind.Reference
              ? qualifiedNameToArray(param.default.name).join("/")
              : param.default !== undefined
              ? "..."
              : undefined

          return `${param.name}${
            constraint !== undefined ? ` extends ${constraint}` : ""
          }${defaultValue !== undefined ? ` = ${defaultValue}` : ""}`
        })
        .join(", ")}>`
    : id

  return headerWithDescription(
    h(
      3,
      jsDoc?.tags.title
        ? `${jsDoc?.tags.title} (\`${fullName}\`)`
        : `\`${fullName}\``,
      id
    ),
    jsDoc?.comment
  )
}

const headerWithDescription = (
  title: string,
  description: string | undefined
) => {
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

  export const line = <T>(
    label: string,
    value: T | undefined,
    transform?: (value: NonNullable<T>) => string | number | boolean,
    config: Config = {}
  ) =>
    isNotNullish(value)
      ? transform
        ? linemd(label, transform(value), config.indent)
        : linemd(label, value, config.indent)
      : undefined

  export const create = (items: (string | undefined)[]) =>
    items.filter((item) => item !== undefined).join(EOL)
}

type SimpleNode = TokenNode | LiteralNode | ReferenceNode | EnumerationNode

const simpleBody = (node: SimpleNode, file: RootNode): string => {
  switch (node.kind) {
    case NodeKind.Token: {
      switch (node.token) {
        case TokenKind.Number: {
          return LabelledList.create([
            LabelledList.line(
              "Type",
              node.jsDoc?.tags.integer ?? false,
              (value) => (value ? "Integer" : "Number")
            ),
            LabelledList.line("Default", node.jsDoc?.tags.default, icodejson),
            LabelledList.line("Minimum", node.jsDoc?.tags.minimum, icode),
            LabelledList.line(
              "Exclusive Minimum",
              node.jsDoc?.tags.exclusiveMinimum,
              icode
            ),
            LabelledList.line("Maximum", node.jsDoc?.tags.maximum, icode),
            LabelledList.line(
              "Exclusive Maximum",
              node.jsDoc?.tags.exclusiveMaximum,
              icode
            ),
            LabelledList.line(
              "Multiple of",
              node.jsDoc?.tags.multipleOf,
              icode
            ),
          ])
        }
        case TokenKind.String: {
          return LabelledList.create([
            LabelledList.line(
              "Type",
              node.jsDoc?.tags.markdown ?? false,
              (value) => (value ? "Markdown-formatted text" : "String")
            ),
            LabelledList.line("Default", node.jsDoc?.tags.default, icodejson),
            LabelledList.line(
              "Minimum Length",
              node.jsDoc?.tags.minLength,
              icode
            ),
            LabelledList.line(
              "Maximum Length",
              node.jsDoc?.tags.maxLength,
              icode
            ),
            LabelledList.line("Format", node.jsDoc?.tags.format, icode),
            LabelledList.line("Pattern", node.jsDoc?.tags.pattern, icode),
          ])
        }
        case TokenKind.Boolean: {
          return LabelledList.create([
            LabelledList.line("Type", "Boolean"),
            LabelledList.line("Default", node.jsDoc?.tags.default, icodejson),
          ])
        }
        default:
          return assertExhaustive(node.token)
      }
    }
    case NodeKind.Literal: {
      return LabelledList.create([
        LabelledList.line("Constant", node.value, icodejson),
      ])
    }
    case NodeKind.Reference: {
      return LabelledList.create([
        LabelledList.line("Type", node, () => {
          const externalFilePath = getRelativeExternalPath(node, file, ".md")
          const fullQualifiedName = getFullyQualifiedNameAsPath(node, file)
          const mainType = a(
            fullQualifiedName,
            `${externalFilePath ?? ""}#${
              getAliasedImportName(node, file) ?? fullQualifiedName
            }`
          )

          if (node.typeArguments) {
            const parameters = node.typeArguments
              .map((arg) => {
                if (isReferenceNode(arg)) {
                  const externalFilePath = getRelativeExternalPath(
                    arg,
                    file,
                    ".md"
                  )
                  const fullQualifiedName = getFullyQualifiedNameAsPath(
                    arg,
                    file
                  )
                  return a(
                    fullQualifiedName,
                    `${externalFilePath ?? ""}#${
                      getAliasedImportName(arg, file) ?? fullQualifiedName
                    }`
                  )
                } else if (isTokenNode(arg)) {
                  switch (arg.token) {
                    case TokenKind.Boolean:
                      return "Boolean"

                    case TokenKind.Number:
                      return "Number"

                    case TokenKind.String:
                      return "String"

                    default:
                      return assertExhaustive(arg.token)
                  }
                } else {
                  return "..."
                }
              })
              .join(", ")

            return `${mainType}&lt;${parameters}&gt;`
          }

          return mainType
        }),
      ])
    }
    case NodeKind.Enumeration: {
      return LabelledList.create([
        LabelledList.line("Possible values", node.children, (cases) =>
          cases
            .map((value) => value.value)
            .map(icodejson)
            .join(", ")
        ),
      ])
    }
    default:
      return assertExhaustive(node)
  }
}

type SectionNode = {
  inline: string[]
  append: SectionNode[]
}

const mergeParagraphs = ({ inline, append }: SectionNode): string[] => [
  ...inline,
  ...append.flatMap(mergeParagraphs),
]

const arrayBody = (
  node: ArrayNode,
  propertyPath: string,
  file: RootNode
): SectionNode => {
  const itemsPropertyPath = `${propertyPath}[]`

  return {
    inline: [
      LabelledList.create([
        LabelledList.line("Type", "List"),
        LabelledList.line("Items", itemsPropertyPath, (anchor) =>
          a(anchor, anchorUrl(anchor))
        ),
        LabelledList.line("Default", node.jsDoc?.tags.default, icodejson),
        LabelledList.line("Minimum Items", node.jsDoc?.tags.minItems, icode),
        LabelledList.line("Maximum Items", node.jsDoc?.tags.maxItems, icode),
        LabelledList.line(
          "Unique Items",
          node.jsDoc?.tags.uniqueItems,
          boolean
        ),
      ]),
    ],
    append: [definitionToMarkdown(itemsPropertyPath, node.children, file)],
  }
}

const tupleBody = (
  node: TupleNode,
  propertyPath: string,
  file: RootNode
): SectionNode => {
  const indexedPropertyPath = (index: number) => `${propertyPath}[${index}]`

  return {
    inline: [
      LabelledList.create([
        LabelledList.line("Type", "Tuple"),
        LabelledList.line(
          "Items",
          node.children,
          (childNodes) =>
            `[${childNodes
              .map((_, index) =>
                a(indexedPropertyPath(index), indexedPropertyPath(index))
              )
              .join(", ")}]`
        ),
        LabelledList.line("Default", node.jsDoc?.tags.default, icodejson),
      ]),
    ],
    append: node.children.map((childNode, index) =>
      definitionToMarkdown(indexedPropertyPath(index), childNode, file)
    ),
  }
}

const unionBody = (
  node: UnionNode,
  propertyPath: string,
  file: RootNode
): SectionNode => {
  const id = (childNode: ChildNode, index: number) => {
    switch (childNode.kind) {
      case NodeKind.Record: {
        const tagProperty = childNode.members.find(
          (member) => member.identifier === "tag"
        )

        return tagProperty && tagProperty.value.kind === NodeKind.Literal
          ? tagProperty.value.value.toString()
          : index.toFixed(0)
      }

      case NodeKind.Reference: {
        return getRightmostQualifiedNameSegment(childNode.name)
      }

      case NodeKind.Record:
      case NodeKind.Dictionary:
      case NodeKind.Token:
      case NodeKind.Reference:
      case NodeKind.Array:
      case NodeKind.Union:
      case NodeKind.Literal:
      case NodeKind.Tuple:
      case NodeKind.Intersection: {
        return index.toFixed(0)
      }
      default:
        return assertExhaustive(childNode)
    }
  }

  const casePropertyPath = (caseId: string) => `${propertyPath}'${caseId}`

  return {
    inline: [
      LabelledList.create([
        LabelledList.line("Type", "Union"),
        LabelledList.line("Cases", node.children, (cases) =>
          cases
            .map((childNode, index) => {
              const caseId = casePropertyPath(id(childNode, index))

              return a(caseId, anchorUrl(caseId))
            })
            .join(" | ")
        ),
      ]),
    ],
    append: node.children.map((childNode, index) =>
      definitionToMarkdown(
        casePropertyPath(id(childNode, index)),
        childNode,
        file
      )
    ),
  }
}

const dictionaryBody = (
  node: DictionaryNode,
  propertyPath: string,
  file: RootNode
): SectionNode => {
  const itemsPropertyPath = `${propertyPath}[key]`

  return {
    inline: [
      LabelledList.create([
        LabelledList.line("Type", "Dictionary"),
        LabelledList.line("Property Values", itemsPropertyPath, (anchor) =>
          a(anchor, anchorUrl(anchor))
        ),
        LabelledList.line("Default", node.jsDoc?.tags.default, icodejson),
        LabelledList.line("Pattern", node.pattern, icode),
        LabelledList.line(
          "Minimum Properties",
          node.jsDoc?.tags.minProperties,
          icode
        ),
      ]),
    ],
    append: [definitionToMarkdown(itemsPropertyPath, node.children, file)],
  }
}

const strictObjectBody = (
  node: RecordNode,
  propertyPath: string,
  file: RootNode
): SectionNode => {
  const nodeElements = node.members

  if (nodeElements.length === 0) {
    return {
      inline: [
        LabelledList.create([LabelledList.line("Type", "Empty Object")]),
      ],
      append: [],
    }
  } else {
    const propertiesOverview = nodeElements
      .map((member) => {
        const propertyPropertyPath = `${propertyPath}/${member.identifier}`
        const title = `\`${member.identifier}${member.isRequired ? "" : "?"}\``

        return [
          title,
          member.jsDoc?.comment?.split("\n\n")[0]?.replaceAll("\n", " ") ?? "",
          a("See details", anchorUrl(propertyPropertyPath)),
        ].join(" | ")
      })
      .join(EOL)

    const properties = nodeElements.reduce<SectionNode>(
      ({ inline, append }, member) => {
        const propertyPropertyPath = `${propertyPath}/${member.identifier}`
        const title = h(
          4,
          `\`${member.identifier}${member.isRequired ? "" : "?"}\``,
          propertyPropertyPath
        )

        if (member.value.kind === NodeKind.Record) {
          return {
            inline: [
              ...inline,
              headerWithDescription(title, member.jsDoc?.comment),
              LabelledList.create([
                LabelledList.line("Type", propertyPropertyPath, (anchor) =>
                  a("Object", anchorUrl(anchor))
                ),
                LabelledList.line(
                  "Default",
                  node.jsDoc?.tags.default,
                  icodejson
                ),
              ]),
            ],
            append: [
              ...append,
              definitionToMarkdown(propertyPropertyPath, member.value, file),
            ],
          }
        } else {
          const { inline: inlineCurrent, append: appendCurrent } =
            definitionToMarkdown(
              propertyPropertyPath,
              member.value,
              file,
              true,
              headerWithDescription(title, member.jsDoc?.comment)
            )

          return {
            inline: [...inline, ...inlineCurrent],
            append: [...append, ...appendCurrent],
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
          LabelledList.line("Default", node.jsDoc?.tags.default, icodejson),
          LabelledList.line(
            "Minimum Properties",
            node.jsDoc?.tags.minProperties,
            icode
          ),
        ]),
        `Key | Description | Details${EOL}:-- | :-- | :--${EOL}${propertiesOverview}`,
        ...properties.inline,
      ],
      append: properties.append,
    }
  }
}

const prependHeader = (
  propertyPath: string,
  node: StatementNode | ChildNode,
  skipLine: boolean,
  header: string | undefined,
  { inline, append }: SectionNode
) => ({
  inline: [
    ...(!skipLine ? ["---"] : []),
    header ?? definitionHeader(propertyPath, node.jsDoc),
    ...inline,
  ],
  append,
})

const definitionToMarkdown = (
  propertyPath: string,
  node: StatementNode | ChildNode,
  file: RootNode,
  skipLine = false,
  header?: string
): SectionNode => {
  switch (node.kind) {
    case NodeKind.Token:
    case NodeKind.Literal:
    case NodeKind.Reference:
    case NodeKind.Enumeration: {
      return prependHeader(propertyPath, node, skipLine, header, {
        inline: [simpleBody(node, file)],
        append: [],
      })
    }
    case NodeKind.Record: {
      return prependHeader(
        propertyPath,
        node,
        skipLine,
        header,
        strictObjectBody(node, propertyPath, file)
      )
    }
    case NodeKind.Array: {
      return prependHeader(
        propertyPath,
        node,
        skipLine,
        header,
        arrayBody(node, propertyPath, file)
      )
    }
    case NodeKind.Union: {
      return prependHeader(
        propertyPath,
        node,
        skipLine,
        header,
        unionBody(node, propertyPath, file)
      )
    }
    case NodeKind.Dictionary: {
      return prependHeader(
        propertyPath,
        node,
        skipLine,
        header,
        dictionaryBody(node, propertyPath, file)
      )
    }
    case NodeKind.Tuple: {
      return prependHeader(
        propertyPath,
        node,
        skipLine,
        header,
        tupleBody(node, propertyPath, file)
      )
    }
    case NodeKind.Group: {
      return {
        inline: [],
        append: Object.entries(node.children).map(([key, childNode], i) =>
          definitionToMarkdown(
            `${propertyPath}/${key}`,
            childNode,
            file,
            skipLine && i === 0
          )
        ),
      }
    }
    case NodeKind.TypeDefinition: {
      return definitionToMarkdown(
        propertyPath,
        node.definition,
        file,
        skipLine,
        definitionHeader(propertyPath, node.jsDoc, node.typeParameters)
      )
    }
    case NodeKind.ExportAssignment: {
      // ignore export assignment
      return { append: [], inline: [] }
    }
    case NodeKind.Intersection: {
      // TODO: implement intersection
      return { append: [], inline: [] }
    }
    default:
      return assertExhaustive(node)
  }
}

export const transformAst = (ast: RootNode): string => {
  const ref =
    ast.jsDoc?.tags.main !== undefined
      ? ast.children.find(({ name }) => name === ast.jsDoc?.tags.main)
      : undefined

  const definitions = ast.children
    .map((definition, i) =>
      definitionToMarkdown(definition.name, definition, ast, i === 0)
    )
    .flatMap(mergeParagraphs)

  return (
    [docHeader(ast, ref?.jsDoc), h(2, "Definitions"), ...definitions].join(
      EOL + EOL
    ) + EOL
  )
}
