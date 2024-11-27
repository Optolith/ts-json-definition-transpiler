import { AstTransformer, Renderer } from "../../main.js"
import { DeclNode } from "./ast/types.js"
import { renderAstRoot } from "./renderer.js"
import { transformAst } from "./transform.js"

const createTransformer = (options: SwiftOptions): AstTransformer => {
  const transformer: AstTransformer = (ast, meta) => {
    const main = ast.jsDoc?.tags.main

    const swiftAst = transformAst(ast, options)

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

  /**
   *
   * @param ast The AST to modify.
   * @returns A new AST.
   */
  modifyAst?: (ast: readonly DeclNode[]) => DeclNode[]

  enumerationSynthesizationDiscriminatorKey?: string
  forceConstantStructMembers?: boolean
  defaultPublic?: boolean
  convertIdentifiersToNamingConvention?: boolean
  generateStructInitializers?: boolean
  synthesizeDecodable?: boolean
}
