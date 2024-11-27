import * as assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as SourceAst from "../../../src/ast.js"
import {
  dictionaryType,
  enumCaseDecl,
  enumCaseElement,
  enumDecl,
  identifierPattern,
  identifierType,
  integerLiteralExpr,
  optionalType,
  patternBinding,
  stringLiteralExpr,
  structDecl,
  typeAliasDecl,
  variableDecl,
} from "../../../src/renderers/swift/ast/creators.js"
import * as SwiftAst from "../../../src/renderers/swift/ast/types.js"
import { statementNodeToDeclNode } from "../../../src/renderers/swift/transform.js"

describe("statementNodeToDeclNode", () => {
  describe("GroupNode", () => {
    it("should convert a GroupNode to a DeclNode", () => {
      assert.deepEqual<SwiftAst.DeclNode>(
        statementNodeToDeclNode(
          {
            kind: SourceAst.NodeKind.Group,
            fileName: "file",
            name: "Group",
            children: [],
          },
          { packageName: "" },
          undefined
        ),
        enumDecl("Group", {}, [])
      )
    })
  })

  describe("EnumerationNode", () => {
    it("should convert an EnumerationNode with raw String values to a DeclNode", () => {
      assert.deepEqual<SwiftAst.DeclNode>(
        statementNodeToDeclNode(
          {
            kind: SourceAst.NodeKind.Enumeration,
            fileName: "file",
            name: "Enumeration",
            children: [
              {
                kind: SourceAst.NodeKind.EnumerationCase,
                fileName: "file",
                name: "Case",
                value: "1",
              },
            ],
          },
          { packageName: "" },
          undefined
        ),
        enumDecl(
          "Enumeration",
          {
            inheritanceClause: [identifierType("String")],
          },
          [
            enumCaseDecl({}, [
              enumCaseElement("Case", undefined, stringLiteralExpr("1")),
            ]),
          ]
        )
      )
    })

    it("should convert an EnumerationNode with raw Integer values to a DeclNode", () => {
      assert.deepEqual<SwiftAst.DeclNode>(
        statementNodeToDeclNode(
          {
            kind: SourceAst.NodeKind.Enumeration,
            fileName: "file",
            name: "Enumeration",
            children: [
              {
                kind: SourceAst.NodeKind.EnumerationCase,
                fileName: "file",
                name: "Case",
                value: 1,
              },
            ],
          },
          { packageName: "" },
          undefined
        ),
        enumDecl(
          "Enumeration",
          {
            inheritanceClause: [identifierType("Int")],
          },
          [
            enumCaseDecl({}, [
              enumCaseElement("Case", undefined, integerLiteralExpr(1)),
            ]),
          ]
        )
      )
    })
  })

  describe("TypeDefinitionNode", () => {
    it("should convert a TypeDefinitionNode with a record to a StructDeclNode", () => {
      assert.deepEqual<SwiftAst.DeclNode>(
        statementNodeToDeclNode(
          {
            kind: SourceAst.NodeKind.TypeDefinition,
            fileName: "file",
            name: "Group",
            definition: {
              kind: SourceAst.NodeKind.Record,
              fileName: "file",
              members: [
                {
                  kind: SourceAst.NodeKind.Member,
                  fileName: "file",
                  identifier: "id",
                  isReadOnly: false,
                  isRequired: true,
                  value: {
                    kind: SourceAst.NodeKind.Token,
                    fileName: "file",
                    token: SourceAst.TokenKind.String,
                  },
                },
                {
                  kind: SourceAst.NodeKind.Member,
                  fileName: "file",
                  identifier: "constantValue",
                  isReadOnly: true,
                  isRequired: true,
                  value: {
                    kind: SourceAst.NodeKind.Token,
                    fileName: "file",
                    token: SourceAst.TokenKind.Number,
                  },
                },
                {
                  kind: SourceAst.NodeKind.Member,
                  fileName: "file",
                  identifier: "optionalMember",
                  isReadOnly: true,
                  isRequired: false,
                  value: {
                    kind: SourceAst.NodeKind.Token,
                    fileName: "file",
                    token: SourceAst.TokenKind.String,
                  },
                },
              ],
            },
          },
          { packageName: "" },
          undefined
        ),
        structDecl("Group", {}, [
          variableDecl({}, SwiftAst.Keyword.var, [
            patternBinding(identifierPattern("id"), identifierType("String")),
          ]),
          variableDecl({}, SwiftAst.Keyword.let, [
            patternBinding(
              identifierPattern("constantValue"),
              identifierType("Double")
            ),
          ]),
          variableDecl({}, SwiftAst.Keyword.let, [
            patternBinding(
              identifierPattern("optionalMember"),
              optionalType(identifierType("String"))
            ),
          ]),
        ])
      )
    })

    it("should convert a TypeDefinitionNode with a dictionary to a TypeAliasNode", () => {
      assert.deepEqual<SwiftAst.DeclNode>(
        statementNodeToDeclNode(
          {
            kind: SourceAst.NodeKind.TypeDefinition,
            fileName: "file",
            name: "Dict",
            definition: {
              kind: SourceAst.NodeKind.Dictionary,
              fileName: "file",
              children: {
                kind: SourceAst.NodeKind.Token,
                fileName: "file",
                token: SourceAst.TokenKind.String,
              },
            },
          },
          { packageName: "" },
          undefined
        ),
        typeAliasDecl(
          "Dict",
          {},
          dictionaryType(identifierType("String"), identifierType("String"))
        )
      )
    })
  })
})
