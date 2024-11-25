import { isNotNullish } from "@optolith/helpers/nullable"
import { assertExhaustive } from "@optolith/helpers/typeSafety"
import { basename } from "node:path"
import { Doc } from "../../ast.js"
import { AstTransformer, Renderer } from "../../main.js"
import {
  ArrayTypeNode,
  AssignmentExprNode,
  AttributeListNode,
  AttributeNode,
  AttributeNode_Arguments,
  AvailabilityArgumentListNode,
  AvailabilityArgumentNode,
  AvailabilityArgumentNode_Argument,
  AvailabilityLabeledArgumentNode,
  AvailabilityTokenArgumentNode,
  BinaryOperatorExprNode,
  BinaryOperatorToken,
  BooleanLiteralExprNode,
  CodeBlockItemListNode,
  CodeBlockItemNode,
  CodeBlockItemNode_Item,
  CodeBlockNode,
  CompositionTypeElementListNode,
  CompositionTypeElementNode,
  CompositionTypeNode,
  DeclModifierListNode,
  DeclModifierNode,
  DeclNode,
  DeclReferenceExprNode,
  DictionaryTypeNode,
  EnumCaseDeclNode,
  EnumCaseElementListNode,
  EnumCaseElementNode,
  EnumCaseParameterClauseNode,
  EnumCaseParameterListNode,
  EnumCaseParameterNode,
  EnumDeclNode,
  ExpressionStmtNode,
  ExprNode,
  FloatLiteralExprNode,
  FunctionEffectSpecifiersNode,
  FunctionParameterClauseNode,
  FunctionParameterList,
  FunctionParameterNode,
  FunctionSignatureNode,
  GenericArgumentClause,
  GenericArgumentListNode,
  GenericArgumentNode,
  GenericParameterClause,
  GenericParameterListNode,
  GenericParameterNode,
  IdentifierPatternNode,
  IdentifierToken,
  IdentifierTypeNode,
  InfixOperatorExprNode,
  InheritanceClauseNode,
  InheritanceTypeListNode,
  InheritanceTypeNode,
  InitializerClauseNode,
  InitializerDeclNode,
  IntegerLiteralExprNode,
  Keyword,
  KeywordToken,
  MemberAccessExprNode,
  MemberBlockItemListNode,
  MemberBlockItemNode,
  MemberBlockNode,
  NilLiteralExprNode,
  NodeKind,
  OptionalTypeNode,
  PatternBindingListNode,
  PatternBindingNode,
  PatternNode,
  ReturnClauseNode,
  StmtNode,
  StringLiteralExprNode,
  StructDeclNode,
  ThrowsClauseNode,
  Token,
  TokenKind,
  transformAst,
  TransformOptions,
  TupleTypeElementListNode,
  TupleTypeElementNode,
  TupleTypeNode,
  TypeAliasDeclNode,
  TypeAnnotationNode,
  TypeInitializerClauseNode,
  TypeNode,
  VariableDeclNode,
} from "./ast.js"

const prefixLines = (
  prefix: string,
  text: string,
  includeEmptyLines: boolean = false
): string =>
  text
    .split("\n")
    .map((line) =>
      includeEmptyLines || line.length > 0 ? prefix + line : line
    )
    .join("\n")

const applyIndentation = (indentLevel: number, text: string): string =>
  prefixLines("    ".repeat(indentLevel), text)

const renderDocumentation = (jsDoc?: Doc): string =>
  jsDoc?.comment === undefined
    ? ""
    : prefixLines("/// ", jsDoc.comment, true) + "\n"

const joinSyntax = (...syntaxes: (string | undefined)[]): string =>
  syntaxes.filter(isNotNullish).join("")

const renderLabel = (
  firstName: Token | undefined,
  secondName: Token | undefined
) =>
  firstName !== undefined || secondName !== undefined
    ? `${[firstName, secondName]
        .filter(isNotNullish)
        .map((token) => renderToken(token))
        .join(" ")}: `
    : ""

//#region Tokens

const renderToken = (token: Token): string => {
  switch (token.kind) {
    case TokenKind.BinaryOperator:
      return renderBinaryOperatorToken(token)
    case TokenKind.Identifier:
      return renderIdentifierToken(token)
    case TokenKind.Keyword:
      return renderKeywordToken(token)
    default:
      return assertExhaustive(token)
  }
}

const renderBinaryOperatorToken = (token: BinaryOperatorToken): string =>
  token.operator

const renderIdentifierToken = (token: IdentifierToken): string =>
  token.identifier

const renderKeywordToken = (token: KeywordToken): string => token.keyword

//#endregion

//#region Declarations

export const renderDeclNode = (node: DeclNode): string => {
  switch (node.kind) {
    case NodeKind.EnumCaseDecl:
      return renderEnumCaseDeclNode(node)
    case NodeKind.EnumDecl:
      return renderEnumDeclNode(node)
    case NodeKind.InitializerDecl:
      return renderInitializerDeclNode(node)
    case NodeKind.StructDecl:
      return renderStructDeclNode(node)
    case NodeKind.TypeAliasDecl:
      return renderTypeAliasDeclNode(node)
    case NodeKind.VariableDecl:
      return renderVariableDeclNode(node)
    default:
      return assertExhaustive(node)
  }
}

const renderEnumCaseDeclNode = (node: EnumCaseDeclNode): string =>
  joinSyntax(
    renderDocumentation(node.jsDoc),
    node.attributes && renderAttributeListNode(node.attributes),
    "case ",
    renderEnumCaseElementListNode(node.elements)
  )

const renderEnumDeclNode = (node: EnumDeclNode): string =>
  joinSyntax(
    renderDocumentation(node.jsDoc),
    node.attributes && renderAttributeListNode(node.attributes),
    node.modifiers && renderDeclModifierListNode(node.modifiers),
    "enum ",
    renderToken(node.name),
    node.genericParameterClause &&
      renderGenericParameterClause(node.genericParameterClause),
    node.inheritanceClause &&
      renderInheritanceClauseNode(node.inheritanceClause),
    renderMemberBlockNode(node.memberBlock)
  )

const renderInitializerDeclNode = (node: InitializerDeclNode): string =>
  joinSyntax(
    renderDocumentation(node.jsDoc),
    node.attributes && renderAttributeListNode(node.attributes),
    node.modifiers && renderDeclModifierListNode(node.modifiers),
    "init",
    node.optionalMark && renderToken(node.optionalMark),
    node.genericParameterClause &&
      renderGenericParameterClause(node.genericParameterClause),
    renderFunctionSignatureNode(node.signature),
    renderCodeBlockNode(node.body)
  )

const renderStructDeclNode = (node: StructDeclNode): string =>
  joinSyntax(
    renderDocumentation(node.jsDoc),
    node.attributes && renderAttributeListNode(node.attributes),
    node.modifiers && renderDeclModifierListNode(node.modifiers),
    "struct ",
    renderToken(node.name),
    node.genericParameterClause &&
      renderGenericParameterClause(node.genericParameterClause),
    node.inheritanceClause &&
      renderInheritanceClauseNode(node.inheritanceClause),
    renderMemberBlockNode(node.memberBlock)
  )

const renderTypeAliasDeclNode = (node: TypeAliasDeclNode): string =>
  joinSyntax(
    renderDocumentation(node.jsDoc),
    node.attributes && renderAttributeListNode(node.attributes),
    node.modifiers && renderDeclModifierListNode(node.modifiers),
    "typealias ",
    renderToken(node.name),
    node.genericParameterClause &&
      renderGenericParameterClause(node.genericParameterClause),
    renderTypeInitializerClauseNode(node.initializer)
  )

const renderVariableDeclNode = (node: VariableDeclNode): string =>
  joinSyntax(
    renderDocumentation(node.jsDoc),
    node.attributes && renderAttributeListNode(node.attributes),
    node.modifiers && renderDeclModifierListNode(node.modifiers),
    renderToken(node.bindingSpecifier),
    " ",
    renderPatternBindingListNode(node.bindings)
  )

//#endregion

//#region Expressions

const renderExprNode = (node: ExprNode): string => {
  switch (node.kind) {
    case NodeKind.AssignmentExpr:
      return renderAssignmentExprNode(node)
    case NodeKind.BinaryOperatorExpr:
      return renderBinaryOperatorExprNode(node)
    case NodeKind.BooleanLiteralExpr:
      return renderBooleanLiteralExprNode(node)
    case NodeKind.DeclReferenceExpr:
      return renderDeclReferenceExprNode(node)
    case NodeKind.FloatLiteralExpr:
      return renderFloatLiteralExprNode(node)
    case NodeKind.InfixOperatorExpr:
      return renderInfixOperatorExprNode(node)
    case NodeKind.IntegerLiteralExpr:
      return renderIntegerLiteralExprNode(node)
    case NodeKind.MemberAccessExpr:
      return renderMemberAccessExprNode(node)
    case NodeKind.NilLiteralExpr:
      return renderNilLiteralExprNode(node)
    case NodeKind.StringLiteralExpr:
      return renderStringLiteralExprNode(node)
    default:
      return assertExhaustive(node)
  }
}

const renderAssignmentExprNode = (node: AssignmentExprNode): string => "="

const renderBinaryOperatorExprNode = (node: BinaryOperatorExprNode): string =>
  renderToken(node.operator)

const renderBooleanLiteralExprNode = (node: BooleanLiteralExprNode): string =>
  node.value ? "true" : "false"

const renderDeclReferenceExprNode = (node: DeclReferenceExprNode): string =>
  renderToken(node.baseName)

const renderFloatLiteralExprNode = (node: FloatLiteralExprNode): string =>
  node.value.toString()

const renderInfixOperatorExprNode = (node: InfixOperatorExprNode): string =>
  joinSyntax(
    renderExprNode(node.leftOperand),
    " ",
    renderExprNode(node.operator),
    " ",
    renderExprNode(node.rightOperand)
  )

const renderIntegerLiteralExprNode = (node: IntegerLiteralExprNode): string =>
  node.value.toString()

const renderMemberAccessExprNode = (node: MemberAccessExprNode): string =>
  joinSyntax(
    node.base && renderExprNode(node.base) + ".",
    renderDeclReferenceExprNode(node.declName)
  )

const renderNilLiteralExprNode = (_node: NilLiteralExprNode): string =>
  Keyword.nil

const renderStringLiteralExprNode = (node: StringLiteralExprNode): string =>
  `"${node.value}"`

//#endregion

//#region Patterns

const renderPatternNode = (node: PatternNode): string =>
  renderIdentifierPatternNode(node)

const renderIdentifierPatternNode = (node: IdentifierPatternNode): string =>
  node.name

//#endregion

//#region Statements

const renderStmtNode = (node: StmtNode): string =>
  renderExpressionStmtNode(node)

const renderExpressionStmtNode = (node: ExpressionStmtNode): string =>
  renderExprNode(node.expression)

//#endregion

//#region Types

const renderTypeNode = (node: TypeNode): string => {
  switch (node.kind) {
    case NodeKind.ArrayType:
      return renderArrayTypeNode(node)
    case NodeKind.CompositionType:
      return renderCompositionTypeNode(node)
    case NodeKind.DictionaryType:
      return renderDictionaryTypeNode(node)
    case NodeKind.OptionalType:
      return renderOptionalTypeNode(node)
    case NodeKind.TupleType:
      return renderTupleTypeNode(node)
    case NodeKind.IdentifierType:
      return renderIdentifierTypeNode(node)
    default:
      return assertExhaustive(node)
  }
}

const renderArrayTypeNode = (node: ArrayTypeNode): string =>
  `[${renderTypeNode(node.element)}]`

const renderCompositionTypeNode = (node: CompositionTypeNode): string =>
  renderCompositionTypeElementListNode(node.elements)

const renderDictionaryTypeNode = (node: DictionaryTypeNode): string =>
  `[${renderTypeNode(node.key)}: ${renderTypeNode(node.value)}]`

const renderIdentifierTypeNode = (node: IdentifierTypeNode): string =>
  joinSyntax(
    renderToken(node.name),
    node.genericArgumentClause &&
      renderGenericArgumentClause(node.genericArgumentClause)
  )

const renderOptionalTypeNode = (node: OptionalTypeNode): string =>
  `${renderTypeNode(node.wrappedType)}?`

const renderTupleTypeNode = (node: TupleTypeNode): string =>
  `(${renderTupleTypeElementListNode(node.elements)})`

//#endregion

//#region Collections

const renderAvailabilityArgumentListNode = (
  node: AvailabilityArgumentListNode
): string => node.arguments.map(renderAvailabilityArgumentNode).join(", ")

const renderAvailabilityArgumentNode = (
  node: AvailabilityArgumentNode
): string => renderAvailabilityArgumentNode_Argument(node.argument)

const renderAvailabilityArgumentNode_Argument = (
  node: AvailabilityArgumentNode_Argument
): string => {
  switch (node.kind) {
    case NodeKind.AvailabilityLabeledArgument:
      return renderAvailabilityLabeledArgumentNode(node)
    case NodeKind.AvailabilityTokenArgument:
      return renderAvailabilityTokenArgumentNode(node)
    default:
      return assertExhaustive(node)
  }
}

const renderCodeBlockItemListNode = (node: CodeBlockItemListNode): string =>
  node.elements.map(renderCodeBlockItemNode).join("\n")

const renderCodeBlockItemNode = (node: CodeBlockItemNode): string =>
  renderCodeBlockItemNode_Item(node.item)

const renderCodeBlockItemNode_Item = (node: CodeBlockItemNode_Item): string => {
  switch (node.kind) {
    case NodeKind.EnumCaseDecl:
    case NodeKind.EnumDecl:
    case NodeKind.InitializerDecl:
    case NodeKind.StructDecl:
    case NodeKind.TypeAliasDecl:
    case NodeKind.VariableDecl:
      return renderDeclNode(node)
    case NodeKind.AssignmentExpr:
    case NodeKind.BinaryOperatorExpr:
    case NodeKind.BooleanLiteralExpr:
    case NodeKind.DeclReferenceExpr:
    case NodeKind.FloatLiteralExpr:
    case NodeKind.InfixOperatorExpr:
    case NodeKind.IntegerLiteralExpr:
    case NodeKind.MemberAccessExpr:
    case NodeKind.NilLiteralExpr:
    case NodeKind.StringLiteralExpr:
      return renderExprNode(node)
    case NodeKind.ExpressionStmt:
      return renderStmtNode(node)
    default:
      return assertExhaustive(node)
  }
}

const renderCompositionTypeElementListNode = (
  node: CompositionTypeElementListNode
): string => node.elements.map(renderCompositionTypeElementNode).join(" & ")

const renderCompositionTypeElementNode = (
  node: CompositionTypeElementNode
): string => renderTypeNode(node.type)

const renderDeclModifierListNode = (node: DeclModifierListNode): string =>
  `${node.modifiers.map(renderDeclModifierNode).join(" ")} `

const renderDeclModifierNode = (node: DeclModifierNode): string =>
  joinSyntax(
    renderToken(node.name),
    node.detail && `(${renderToken(node.detail)})`
  )

const renderEnumCaseElementListNode = (node: EnumCaseElementListNode): string =>
  node.elements.map(renderEnumCaseElementNode).join(", ")

const renderEnumCaseElementNode = (node: EnumCaseElementNode): string =>
  joinSyntax(
    renderToken(node.name),
    node.parameterClause &&
      renderEnumCaseParameterClauseNode(node.parameterClause),
    node.rawValue && renderInitializerClauseNode(node.rawValue)
  )

const renderEnumCaseParameterListNode = (
  node: EnumCaseParameterListNode
): string => node.parameters.map(renderEnumCaseParameterNode).join(", ")

const renderEnumCaseParameterNode = (node: EnumCaseParameterNode): string =>
  joinSyntax(
    renderLabel(node.firstName, node.secondName),
    renderTypeNode(node.type)
  )

const renderFunctionParameterList = (node: FunctionParameterList): string =>
  node.parameters.map(renderFunctionParameterNode).join(", ")

const renderFunctionParameterNode = (node: FunctionParameterNode): string =>
  joinSyntax(
    node.attributes &&
      renderAttributeListNode(node.attributes).split("\n").join(" "),
    node.modifiers && renderDeclModifierListNode(node.modifiers),
    renderLabel(node.firstName, node.secondName),
    renderTypeNode(node.type),
    node.defaultValue && renderInitializerClauseNode(node.defaultValue)
  )

const renderGenericArgumentListNode = (node: GenericArgumentListNode): string =>
  node.arguments.map(renderGenericArgumentNode).join(", ")

const renderGenericArgumentNode = (node: GenericArgumentNode): string =>
  renderTypeNode(node.argument)

const renderGenericParameterListNode = (
  node: GenericParameterListNode
): string => node.parameters.map(renderGenericParameterNode).join(", ")

const renderGenericParameterNode = (node: GenericParameterNode): string =>
  `${renderToken(node.name)}${
    node.inheritedType ? `: ${renderTypeNode(node.inheritedType)}` : ""
  }`

const renderInheritanceTypeListNode = (node: InheritanceTypeListNode): string =>
  node.types.map(renderInheritanceTypeNode).join(", ")

const renderInheritanceTypeNode = (node: InheritanceTypeNode): string =>
  renderTypeNode(node.type)

const renderMemberBlockItemListNode = (node: MemberBlockItemListNode): string =>
  node.items.map(renderMemberBlockItemNode).join("\n\n")

const renderMemberBlockItemNode = (node: MemberBlockItemNode): string =>
  renderDeclNode(node.decl)

const renderPatternBindingListNode = (node: PatternBindingListNode): string =>
  node.bindings.map(renderPatternBindingNode).join(", ")

const renderPatternBindingNode = (node: PatternBindingNode): string =>
  joinSyntax(
    node.pattern.name,
    node.typeAnnotation && renderTypeAnnotationNode(node.typeAnnotation),
    node.initializer && renderInitializerClauseNode(node.initializer)
  )

const renderTupleTypeElementListNode = (
  node: TupleTypeElementListNode
): string => node.elements.map(renderTupleTypeElementNode).join(", ")

const renderTupleTypeElementNode = (node: TupleTypeElementNode): string =>
  joinSyntax(
    renderLabel(node.firstName, node.secondName),
    renderTypeNode(node.type)
  )

//#endregion

//#region Attributes

const renderAttributeListNode = (node: AttributeListNode): string =>
  node.attributes.map(renderAttributeNode).join("\n") + "\n"

const renderAttributeNode = (node: AttributeNode): string =>
  `@${renderTypeNode(node.attributeName)}(${renderAttributeNode_Arguments(
    node.arguments
  )})`

const renderAttributeNode_Arguments = (node: AttributeNode_Arguments): string =>
  renderAvailabilityArgumentListNode(node)

//#endregion

//#region Miscellaneous Nodes

const renderAvailabilityLabeledArgumentNode = (
  node: AvailabilityLabeledArgumentNode
): string => `${node.label}: ${node.value}`

const renderAvailabilityTokenArgumentNode = (
  node: AvailabilityTokenArgumentNode
): string => renderToken(node.token)

const renderCodeBlockNode = (node: CodeBlockNode): string =>
  ` {\n${applyIndentation(1, renderCodeBlockItemListNode(node.statements))}\n}`

const renderEnumCaseParameterClauseNode = (
  node: EnumCaseParameterClauseNode
): string => `(${renderEnumCaseParameterListNode(node.parameters)})`

const renderFunctionEffectSpecifiersNode = (
  node: FunctionEffectSpecifiersNode
): string =>
  joinSyntax(
    node.asyncSpecifier && " " + renderToken(node.asyncSpecifier),
    node.throwsClause && " " + renderThrowsClauseNode(node.throwsClause)
  )

const renderFunctionParameterClauseNode = (
  node: FunctionParameterClauseNode
): string => `(${renderFunctionParameterList(node.parameters)})`

const renderFunctionSignatureNode = (node: FunctionSignatureNode): string =>
  joinSyntax(
    renderFunctionParameterClauseNode(node.parameterClause),
    node.effectSpecifiers &&
      renderFunctionEffectSpecifiersNode(node.effectSpecifiers),
    node.returnClause && renderReturnClauseNode(node.returnClause)
  )

const renderGenericArgumentClause = (node: GenericArgumentClause): string =>
  `<${renderGenericArgumentListNode(node.arguments)}>`

const renderGenericParameterClause = (node: GenericParameterClause): string =>
  `<${renderGenericParameterListNode(node.parameters)}>`

const renderInheritanceClauseNode = (node: InheritanceClauseNode): string =>
  `: ${renderInheritanceTypeListNode(node.inheritedTypes)}`

const renderInitializerClauseNode = (node: InitializerClauseNode): string =>
  " = " + renderExprNode(node.value)

const renderMemberBlockNode = (node: MemberBlockNode): string =>
  ` {\n${applyIndentation(1, renderMemberBlockItemListNode(node.members))}\n}`

const renderReturnClauseNode = (node: ReturnClauseNode): string => ""

const renderThrowsClauseNode = (node: ThrowsClauseNode): string =>
  joinSyntax(
    renderToken(node.throwsSpecifier),
    node.type && `(${renderTypeNode(node.type)})`
  )

const renderTypeAnnotationNode = (node: TypeAnnotationNode): string =>
  `: ${renderTypeNode(node.type)}`

const renderTypeInitializerClauseNode = (
  node: TypeInitializerClauseNode
): string => ` = ${renderTypeNode(node.value)}`

//#endregion

const createTransformer = (options: SwiftOptions): AstTransformer => {
  const transformer: AstTransformer = (ast, meta) => {
    const main = ast.jsDoc?.tags.main

    const swiftAst = transformAst(ast, options)

    if (swiftAst === undefined) {
      return undefined
    }

    return `//
//  ${basename(meta.absolutePath)}
//  ${options.packageName}
//

import DiscriminatedEnum

${swiftAst.map((node) => renderDeclNode(node)).join("\n\n")}\n`
  }

  return transformer
}

export const swiftRenderer = (options: SwiftOptions): Renderer => ({
  fileExtension: ".swift",
  transformer: createTransformer(options),
  resolveTypeParameters: false,
})

export type SwiftOptions = TransformOptions & {
  /**
   * The package name to use in all file comments.
   */
  packageName: string

  /**
   *
   * @param ast The AST to modify.
   * @returns A new AST.
   */
  modifyAst?: (ast: readonly DeclNode[]) => DeclNode[]
}
