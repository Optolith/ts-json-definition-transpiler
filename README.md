# Optolith TypeScript to JSON Schema and Markdown

This tool provides an opinionated solution for generating **both JSON Schemas and corresponding Markdown documentation** from a set of TypeScript files. The tool does not support all types possible in TypeScript, only those that are needed in [Optolith](https://github.com/elyukai/optolith-client) and that can be represented in a JSON Schema as well.

## Why?

There are TypeScript to JSON Schema, JSON Schema to Markdown and TypeScript to Markdown converters.

The main issue for JSON Schema with the existing solutions is that the converters that output JSON Schema do not support the full feature set of JSON Schema. The biggest issue is `patternProperties`, which is very important here, since the files that are validated with the JSON Schema documents are edited by hand and `patternProperties` can reduce the number of errors without a need for a custom programmatic validation.

The main issue for Markdown with the existing solutions is that if you convert from TypeScript, they usually target developers, and if you convert from Markdown, the output has a lot of files or does not support the full JSON Schema feature set.

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
      renderer: jsonSchema({ spec: jsonSchemaSpec })
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

### Main type

A module comment may indicate the main type of the module, which can be used by directly importing the JSON Schema without the need to specify the definition inside. The type is referenced to by its name.

Example:

```ts
/**
 * @main Attribute
 */
```

### Supported JSDoc tags

JSDoc | TypeScript | Tag Comment Type | JSON Schema | Markdown
:-- | :-- | :-- | :-- | :--
Description | all | `markdown` | `description` keyword | Description
`@title` | all | `string` | `title` keyword | Heading
`@markdown` | `string` | `boolean` | — | Type: Markdown-formatted text
`@minLength` | `string` | `number` | `minLength` keyword | Minimum Length
`@maxLength` | `string` | `number` | `maxLength` keyword | Maximum Length
`@pattern` | `string` | `string` | `maxLength` keyword | Pattern
`@format` | `string` | `string` | `maxLength` keyword | Format
`@integer` | `number` | `boolean` | `"type": "integer"` instead of `"type": "number"` | Type: Integer
`@minimum` | `number` | `number` | `minimum` keyword | Minimum
`@maximum` | `number` | `number` | `maximum` keyword | Maximum
`@exclusiveMinimum` | `number` | `number` | `exclusiveMinimum` keyword | Exclusive Minimum
`@exclusiveMaximum` | `number` | `number` | `exclusiveMaximum` keyword | Exclusive Maximum
`@multipleOf` | `number` | `number` | `multipleOf` keyword | Multiple of
`@minItems` | `array` | `number` | `minItems` keyword | Minimum Items
`@maxItems` | `array` | `number` | `maxItems` keyword | Maximum Items
`@uniqueItems` | `array` | `boolean` | `uniqueItems` keyword | Unique Items
`@minProperties` | `object` | `number` | `minProperties` keyword | Minimum Properties
`@maxProperties` | `object` | `number` | `maxProperties` keyword | Maximum Properties
`@patternProperties` | `object` | `string` | `patternProperties` keyword | Values matching pattern

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

Generics are **supported in a limited way**. You can use them, but since they are not supported in JSON Schema, the output is different: The declarations of types with generics are not output, instead, all locations where this generic type is used are resolved as if you had declared the type directly, without generics. This already happens at the custom AST level, so even if you use the AST for your own format, you'll not get information about generics.

## Examples

You can check out the [Optolith flat-file database schema repository](https://github.com/elyukai/optolith-database-schema), which it has been mainly written for.
