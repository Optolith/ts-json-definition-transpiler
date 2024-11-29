import { EOL } from "node:os"
import { AstTransformer, Renderer } from "../../main.js"
import { transformAst } from "./transform.js"
import { JsonSchema } from "./types.js"

const astToJsonSchema =
  (options: Required<JsonSchemaRendererOptions>): AstTransformer =>
  (file, { relativePath }): string => {
    const jsonSchema: JsonSchema = transformAst(file, options, relativePath)

    return `${JSON.stringify(jsonSchema, undefined, 2).replace(
      /\n/g,
      EOL
    )}${EOL}`
  }

export const JsonSchemaSpec = Object.freeze({
  Draft_07: "Draft_07",
  Draft_2019_09: "Draft_2019_09",
  Draft_2020_12: "Draft_2020_12",
})

export type JsonSchemaSpec = keyof typeof JsonSchemaSpec

export type JsonSchemaRendererOptions = {
  /**
   * The used JSON Schema specification.
   * @default "Draft_2020_12"
   */
  spec?: JsonSchemaSpec

  /**
   * Whether to allow unresolved additional keys in object definitions. This sets the `additionalProperties` JSON Schema keyword for all applicable types.
   * @default false
   */
  allowAdditionalProperties?: boolean
}

export const jsonSchemaRenderer = ({
  spec = JsonSchemaSpec.Draft_2020_12,
  allowAdditionalProperties = false,
}: JsonSchemaRendererOptions = {}): Renderer =>
  Object.freeze({
    transformer: astToJsonSchema({ spec, allowAdditionalProperties }),
    fileExtension: ".schema.json",
    resolveTypeParameters: true,
  })
