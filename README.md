# Optolith TypeScript Data Model Compiler and Documentation Generator

This tool provides an opinionated solution for generating **type definitions for multiple targets as well as Markdown documentation** from a set of TypeScript files. The tool does not support all types possible in TypeScript, only those that are needed in [Optolith](https://github.com/elyukai/optolith-client) and that can be represented in a JSON Schema as well.

## Why?

There are TypeScript to JSON Schema, JSON Schema to Markdown and TypeScript to Markdown converters.

The main issue for JSON Schema with the existing solutions is that the converters that output JSON Schema do not support the full feature set of JSON Schema. The biggest issue is `patternProperties`, which is very important here, since the files that are validated with the JSON Schema documents are edited by hand and `patternProperties` can reduce the number of errors without a need for a custom programmatic validation.

The main issue for Markdown with the existing solutions is that if you convert from TypeScript, they usually target developers, and if you convert from Markdown, the output has a lot of files or does not support the full JSON Schema feature set.

## Targets

The following targets are currently supported:

- [JSON Schema](./docs/targets/jsonSchema.md)
- [Markdown](./docs/targets/markdown.md)
- [Swift](./docs/targets/swift.md)

## Installation

```sh
npm i -D optolith-tsjsonschemamd
```

## Usage

### Programmatic Usage

```ts
import { generate } from "optolith-tsjsonschemamd";
import { jsonSchema, markdown } from "optolith-tsjsonschemamd/renderers";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = dirname(fileURLToPath(import.meta.url))

generate({
  sourceDir: join(root, "src"),
  outputs: [
    {
      targetDir: join(root, "schema"),
      renderer: jsonSchema({ spec: "Draft_07" })
    },
    {
      targetDir: join(root, "docs", "reference"),
      renderer: markdown()
    }
  ]
})
```

`generate` takes all TypeScript files from the absolute `sourceDir` path and its subdirectories and then runs each TypeScript file inside through each output configuration. Built-in output renderers are for JSON Schema definitions (`draft-07`) and Markdown documentation, so all you need to do is to specify absolute folder paths for them and import them from the module.

It does not do any clean-up in the target directories, it only overwrites existing files. You can activate this explicitly, though, for all outputs and for each output individually.

The output directory structure as well as the contents of the files **mirror the TypeScript sources**. The relative directory structure inside the specified root source directory is mirrored, and the contents are simply mapped, so that the output will not have any duplicate types, which are referenced by their relative path instead (except for generic types, see below).

This also implies that all types must be present in the specified root source directory or its subdirectories, otherwise references/links in output files will not work.

You can also build your own renderer by conforming to the `Renderer` type that can be imported.

An error is thrown if the tool encounters an unsupported structure.

### CLI Usage

This package can also be used via the command line.

```sh
otjsmd [-w | --watch] [-c <path-to-config> | --config <path-to-config>]
```

Options must be defined in an ECMAScript module files, which defaults to a file called `otjsmd.config.js` in the directory where the command is run. You can specify a different path using the respective option. Supply the watch option to rebuild whenever a source file changes.

The config file expects the configuration object as the default export of the file.

```js
import { jsonSchema, markdown } from "optolith-tsjsonschemamd/renderers"
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = dirname(fileURLToPath(import.meta.url))

/** @type {import("optolith-tsjsonschemamd").GeneratorOptions} */
export default {
  sourceDir: join(root, "src"),
  outputs: [
    {
      targetDir: join(root, "schema"),
      renderer: jsonSchema({ spec: "Draft_07" })
    },
    {
      targetDir: join(root, "docs", "reference"),
      renderer: markdown()
    }
  ]
}
```

### Supported JSDoc Tags

JSDoc Tag | Attachable to | Tag Comment Type
:-- | :-- | :--
`@title` | all | `string`
`@default` | all | `any`
`@deprecated` | all | `boolean \| string`
`@markdown` | `string` | `boolean`
`@minLength` | `string` | `number`
`@maxLength` | `string` | `number`
`@pattern` | `string` | `string`
`@format` | `string` | `string`
`@integer` | `number` | `boolean`
`@minimum` | `number` | `number`
`@maximum` | `number` | `number`
`@exclusiveMinimum` | `number` | `number`
`@exclusiveMaximum` | `number` | `number`
`@multipleOf` | `number` | `number`
`@minItems` | `array` | `number`
`@maxItems` | `array` | `number`
`@uniqueItems` | `array` | `boolean`
`@minProperties` | `object` | `number`
`@maxProperties` | `object` | `number`
`@patternProperties` | `object` | `string`

#### Boolean tags

Boolean tags require no additional comment, if they are present, they are set to `true`, otherwise they are `false`. You can explicitly set them to `true` if you prefer (e.g. `@integer true`).

#### Pattern Dictionary

Pattern properties are annotated using `@patternProperties`. The value of this annotation is the pattern that should be used for the indexed properties. It is annotated on the indexed property definition, not the object itself.

Example:

```ts
/**
 * @minProperties 1
 */
type Dictionary = {
  /**
   * @patternProperties ^KEY_[1-9]$
   */
  [key: string]: number
}
```

### Generics

Generics are supported, but some export formats may not be able to support them, such as JSON Schema. You can use the `resolveTypeParameters` for a `Renderer` to receive an AST without type parameters. Types with type parameters are still present if all of their type parameters have default arguments, which replace all type parameter occurrences in the type definition. The AST type is the same, but you can ignore all type argument and type parameter properties, since they are all `undefined`.

## Defining your own target

If you want to write your own renderer, you must provide a value that conforms to the `Renderer` type. This type consists of three parts. An AST transformer function, a file extension and (optionally) whether to resolve type parameters (see section about generics).

The transformer function receives the AST for a file and meta information about that file and should return a string that represents the generated code or text output, or `undefined` if no output should be generated for that file. If it’s a string, it is saved to the same *relative* location as in the root directory, but inside the output directory instead and with the file extension specified for the renderer. For example, if the root is defined as `src` and the output directory is `schema` with the `.schema.json` extension, a file at `src/core/Object.ts` will be output to `schema/core/Object.schema.json`.

## Examples

You can check out the [Optolith flat-file database schema repository](https://github.com/elyukai/optolith-database-schema), which it has been mainly written for.
