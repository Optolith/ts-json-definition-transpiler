import * as assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as SourceAst from "../../../src/ast.js"
import * as SwiftAst from "../../../src/renderers/swift/ast.js"

describe("statementNodeToDeclNode", () => {
  describe("GroupNode", () => {
    it("should convert a GroupNode to a DeclNode", () => {
      assert.deepEqual<SwiftAst.DeclNode>(
        SwiftAst.statementNodeToDeclNode(
          {
            kind: SourceAst.NodeKind.Group,
            fileName: "file",
            name: "Group",
            children: [],
          },
          {}
        ),
        {
          kind: SwiftAst.NodeKind.EnumDecl,
          name: { kind: SwiftAst.TokenKind.Identifier, identifier: "Group" },
          memberBlock: {
            kind: SwiftAst.NodeKind.MemberBlock,
            members: {
              kind: SwiftAst.NodeKind.MemberBlockItemList,
              items: [],
            },
          },
        }
      )
    })
  })

  describe("EnumerationNode", () => {
    it("should convert an EnumerationNode with raw String values to a DeclNode", () => {
      assert.deepEqual<SwiftAst.DeclNode>(
        SwiftAst.statementNodeToDeclNode(
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
          {}
        ),
        {
          kind: SwiftAst.NodeKind.EnumDecl,
          name: {
            kind: SwiftAst.TokenKind.Identifier,
            identifier: "Enumeration",
          },
          inheritanceClause: {
            kind: SwiftAst.NodeKind.InheritanceClause,
            inheritedTypes: {
              kind: SwiftAst.NodeKind.InheritanceTypeList,
              types: [
                {
                  kind: SwiftAst.NodeKind.InheritanceType,
                  type: {
                    kind: SwiftAst.NodeKind.IdentifierType,
                    name: {
                      kind: SwiftAst.TokenKind.Identifier,
                      identifier: "String",
                    },
                  },
                },
              ],
            },
          },
          memberBlock: {
            kind: SwiftAst.NodeKind.MemberBlock,
            members: {
              kind: SwiftAst.NodeKind.MemberBlockItemList,
              items: [
                {
                  kind: SwiftAst.NodeKind.MemberBlockItem,
                  decl: {
                    kind: SwiftAst.NodeKind.EnumCaseDecl,
                    elements: {
                      kind: SwiftAst.NodeKind.EnumCaseElementList,
                      elements: [
                        {
                          kind: SwiftAst.NodeKind.EnumCaseElement,
                          name: {
                            kind: SwiftAst.TokenKind.Identifier,
                            identifier: "Case",
                          },
                          rawValue: {
                            kind: SwiftAst.NodeKind.InitializerClause,
                            value: {
                              kind: SwiftAst.NodeKind.StringLiteralExpr,
                              value: "1",
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        }
      )
    })

    it("should convert an EnumerationNode with raw Integer values to a DeclNode", () => {
      assert.deepEqual<SwiftAst.DeclNode>(
        SwiftAst.statementNodeToDeclNode(
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
          {}
        ),
        {
          kind: SwiftAst.NodeKind.EnumDecl,
          name: {
            kind: SwiftAst.TokenKind.Identifier,
            identifier: "Enumeration",
          },
          inheritanceClause: {
            kind: SwiftAst.NodeKind.InheritanceClause,
            inheritedTypes: {
              kind: SwiftAst.NodeKind.InheritanceTypeList,
              types: [
                {
                  kind: SwiftAst.NodeKind.InheritanceType,
                  type: {
                    kind: SwiftAst.NodeKind.IdentifierType,
                    name: {
                      kind: SwiftAst.TokenKind.Identifier,
                      identifier: "Int",
                    },
                  },
                },
              ],
            },
          },
          memberBlock: {
            kind: SwiftAst.NodeKind.MemberBlock,
            members: {
              kind: SwiftAst.NodeKind.MemberBlockItemList,
              items: [
                {
                  kind: SwiftAst.NodeKind.MemberBlockItem,
                  decl: {
                    kind: SwiftAst.NodeKind.EnumCaseDecl,
                    elements: {
                      kind: SwiftAst.NodeKind.EnumCaseElementList,
                      elements: [
                        {
                          kind: SwiftAst.NodeKind.EnumCaseElement,
                          name: {
                            kind: SwiftAst.TokenKind.Identifier,
                            identifier: "Case",
                          },
                          rawValue: {
                            kind: SwiftAst.NodeKind.InitializerClause,
                            value: {
                              kind: SwiftAst.NodeKind.IntegerLiteralExpr,
                              value: 1,
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        }
      )
    })
  })

  describe("TypeDefinitionNode", () => {
    it("should convert a TypeDefinitionNode with a record to a StructDeclNode", () => {
      assert.deepEqual<SwiftAst.DeclNode>(
        SwiftAst.statementNodeToDeclNode(
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
          {}
        ),
        {
          kind: SwiftAst.NodeKind.StructDecl,
          name: { kind: SwiftAst.TokenKind.Identifier, identifier: "Group" },
          memberBlock: {
            kind: SwiftAst.NodeKind.MemberBlock,
            members: {
              kind: SwiftAst.NodeKind.MemberBlockItemList,
              items: [
                {
                  kind: SwiftAst.NodeKind.MemberBlockItem,
                  decl: {
                    kind: SwiftAst.NodeKind.VariableDecl,
                    bindingSpecifier: {
                      kind: SwiftAst.TokenKind.Keyword,
                      keyword: SwiftAst.Keyword.var,
                    },
                    bindings: {
                      kind: SwiftAst.NodeKind.PatternBindingList,
                      bindings: [
                        {
                          kind: SwiftAst.NodeKind.PatternBinding,
                          pattern: {
                            kind: SwiftAst.NodeKind.IdentifierPattern,
                            name: "id",
                          },
                          typeAnnotation: {
                            kind: SwiftAst.NodeKind.TypeAnnotation,
                            type: {
                              kind: SwiftAst.NodeKind.IdentifierType,
                              name: {
                                kind: SwiftAst.TokenKind.Identifier,
                                identifier: "String",
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  kind: SwiftAst.NodeKind.MemberBlockItem,
                  decl: {
                    kind: SwiftAst.NodeKind.VariableDecl,
                    bindingSpecifier: {
                      kind: SwiftAst.TokenKind.Keyword,
                      keyword: SwiftAst.Keyword.let,
                    },
                    bindings: {
                      kind: SwiftAst.NodeKind.PatternBindingList,
                      bindings: [
                        {
                          kind: SwiftAst.NodeKind.PatternBinding,
                          pattern: {
                            kind: SwiftAst.NodeKind.IdentifierPattern,
                            name: "constantValue",
                          },
                          typeAnnotation: {
                            kind: SwiftAst.NodeKind.TypeAnnotation,
                            type: {
                              kind: SwiftAst.NodeKind.IdentifierType,
                              name: {
                                kind: SwiftAst.TokenKind.Identifier,
                                identifier: "Int",
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  kind: SwiftAst.NodeKind.MemberBlockItem,
                  decl: {
                    kind: SwiftAst.NodeKind.VariableDecl,
                    bindingSpecifier: {
                      kind: SwiftAst.TokenKind.Keyword,
                      keyword: SwiftAst.Keyword.let,
                    },
                    bindings: {
                      kind: SwiftAst.NodeKind.PatternBindingList,
                      bindings: [
                        {
                          kind: SwiftAst.NodeKind.PatternBinding,
                          pattern: {
                            kind: SwiftAst.NodeKind.IdentifierPattern,
                            name: "optionalMember",
                          },
                          typeAnnotation: {
                            kind: SwiftAst.NodeKind.TypeAnnotation,
                            type: {
                              kind: SwiftAst.NodeKind.OptionalType,
                              wrappedType: {
                                kind: SwiftAst.NodeKind.IdentifierType,
                                name: {
                                  kind: SwiftAst.TokenKind.Identifier,
                                  identifier: "String",
                                },
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        }
      )
    })

    it("should convert a TypeDefinitionNode with a dictionary to a TypeAliasNode", () => {
      assert.deepEqual<SwiftAst.DeclNode>(
        SwiftAst.statementNodeToDeclNode(
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
          {}
        ),
        {
          kind: SwiftAst.NodeKind.TypeAliasDecl,
          name: { kind: SwiftAst.TokenKind.Identifier, identifier: "Dict" },
          initializer: {
            kind: SwiftAst.NodeKind.TypeInitializerClause,
            value: {
              kind: SwiftAst.NodeKind.DictionaryType,
              key: {
                kind: SwiftAst.NodeKind.IdentifierType,
                name: {
                  kind: SwiftAst.TokenKind.Identifier,
                  identifier: "String",
                },
              },
              value: {
                kind: SwiftAst.NodeKind.IdentifierType,
                name: {
                  kind: SwiftAst.TokenKind.Identifier,
                  identifier: "String",
                },
              },
            },
          },
        }
      )
    })
  })
})
