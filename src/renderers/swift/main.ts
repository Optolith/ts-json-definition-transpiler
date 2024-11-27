import {
  EnumerationNode,
  RecordNode,
  TypeParameterNode,
  UnionNode,
} from "../../ast.js"
import { AstTransformer, Renderer } from "../../main.js"
import { renderAstRoot } from "./renderer.js"
import { transformAst } from "./transform.js"

const createTransformer = (options: SwiftOptions): AstTransformer => {
  const transformer: AstTransformer = (ast, meta) => {
    const main = ast.jsDoc?.tags.main

    const swiftAst = transformAst(ast, options, main)

    if (swiftAst === undefined) {
      return undefined
    }

    return renderAstRoot(swiftAst, meta, options)
  }

  return transformer
}

export const swiftRenderer = (options: SwiftOptions): Renderer => ({
  fileExtension: ".swift",
  transformer: createTransformer(options),
  resolveTypeParameters: false,
})

export type SwiftOptions = {
  /**
   * The package name to use in all file comments.
   */
  packageName: string

  // /**
  //  *
  //  * @param ast The AST to modify.
  //  * @returns A new AST.
  //  */
  // modifyAst?: (ast: AstRoot) => AstRoot

  /**
   * If `struct` members are always generated as `let`. This ignores the `isReadOnly` AST flag.
   */
  forceConstantStructMembers?: boolean

  /**
   * If generated types and members should be `public`.
   */
  defaultPublic?: boolean

  /**
   * If generated type and member names’ casing should be converted to Swift conventions.
   */
  convertIdentifiersToNamingConvention?: boolean

  /**
   * if generated `struct` types should have initializers generated. Initializers will have default `nil` values for optional members.
   */
  generateStructInitializers?: boolean

  /**
   * If generated `struct` types should have `Decodable` conformances.
   */
  decodableSynthesization?: {
    /**
     * For enumerations with associated values, the key of the discriminator property.
     */
    discriminatorKey: string
  }

  /**
   * Conformances to add to generated types.
   */
  addConformances?: {
    /**
     * The identifier of the type to add.
     */
    identifier:
      | string
      | ((
          node: RecordNode | UnionNode | EnumerationNode | TypeParameterNode
        ) => string)

    /**
     * If the type includes `Decodable` conformance, which will not add an additional `Decodable` conformance if `decodableSynthesization` is used.
     */
    includesDecodable?: boolean

    /**
     * If set, whether the type is only for main types (`true`) or sub types (`false`).
     */
    forMainTypes?: boolean
  }[]
}
