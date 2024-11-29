import { AstTransformer, Renderer } from "../../main.js"
import { transformAst } from "./transform.js"

const astToMarkdown: AstTransformer = (file) => transformAst(file)

export const markdownRenderer = (): Renderer =>
  Object.freeze({
    transformer: astToMarkdown,
    fileExtension: ".md",
    resolveTypeParameters: false,
  })
