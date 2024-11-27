import * as assert from "node:assert/strict"
import { describe, it } from "node:test"
import { NodeKind, TokenKind } from "../../../src/ast.js"
import {
  assignmentExpr,
  declReferenceExpr,
  functionParameter,
  functionSignature,
  identifierPattern,
  identifierToken,
  identifierType,
  infixOperatorExpr,
  initializerDecl,
  keywordToken,
  memberAccessExpr,
  nilLiteralExpr,
  optionalType,
  patternBinding,
  structDecl,
  variableDecl,
} from "../../../src/renderers/swift/ast/creators.js"
import { AstRoot, Keyword } from "../../../src/renderers/swift/ast/types.js"
import { transformAst } from "../../../src/renderers/swift/transform.js"

describe("generateStructInitializers", () => {
  it("should generate an initializer where optional variables default to nil", () => {
    assert.deepEqual<AstRoot>(
      transformAst(
        {
          kind: NodeKind.Root,
          fileName: "file",
          imports: [],
          children: [
            {
              kind: NodeKind.TypeDefinition,
              fileName: "file",
              name: "Group",
              definition: {
                kind: NodeKind.Record,
                fileName: "file",
                members: [
                  {
                    kind: NodeKind.Member,
                    fileName: "file",
                    identifier: "id",
                    isReadOnly: true,
                    isRequired: true,
                    value: {
                      kind: NodeKind.Token,
                      fileName: "file",
                      token: TokenKind.String,
                    },
                  },
                  {
                    kind: NodeKind.Member,
                    fileName: "file",
                    identifier: "value",
                    isReadOnly: true,
                    isRequired: false,
                    value: {
                      kind: NodeKind.Token,
                      fileName: "file",
                      token: TokenKind.Number,
                    },
                  },
                ],
              },
            },
          ],
        },
        { packageName: "", generateStructInitializers: true },
        undefined
      ),
      [
        structDecl("Group", {}, [
          variableDecl({}, Keyword.let, [
            patternBinding(identifierPattern("id"), identifierType("String")),
          ]),
          variableDecl({}, Keyword.let, [
            patternBinding(
              identifierPattern("value"),
              optionalType(identifierType("Int"))
            ),
          ]),
          initializerDecl(
            {},
            functionSignature([
              functionParameter(identifierType("String"), "id"),

              functionParameter(
                optionalType(identifierType("Int")),
                "value",
                undefined,
                {
                  defaultValue: nilLiteralExpr,
                }
              ),
            ]),
            [
              infixOperatorExpr(
                memberAccessExpr(
                  declReferenceExpr(identifierToken("id")),
                  declReferenceExpr(keywordToken(Keyword.self))
                ),
                assignmentExpr,
                declReferenceExpr(identifierToken("id"))
              ),
              infixOperatorExpr(
                memberAccessExpr(
                  declReferenceExpr(identifierToken("value")),
                  declReferenceExpr(keywordToken(Keyword.self))
                ),
                assignmentExpr,
                declReferenceExpr(identifierToken("value"))
              ),
            ]
          ),
        ]),
      ]
    )
  })
})
