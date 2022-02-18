# Optolith TypeScript to JSON Schema and Markdown

This tool provides an opinionated solution for generating **both JSON Schemas and corresponding Markdown documentation** from a set of TypeScript files. The tool does not support all types possible in TypeScript, only those that are needed in [Optolith](https://github.com/elyukai/optolith-client) and that can be represented in a JSON Schema as well.

## Why?

There are TypeScript to JSON Schema, JSON Schema to Markdown and TypeScript to Markdown converters.

The main issue for JSON Schema with the existing solutions is that the converters that output JSON Schema do not support the full feature set of JSON Schema. The biggest issue is `patternProperties`, which is very important here, since the files that are validated with the JSON Schema documents are edited by hand and `patternProperties` can reduce the number of errors without a need for a custom programmatic validation.

The main issue for Markdown with the existing solutions is that if you convert from TypeScript, they usually target developers, and if you convert from Markdown, the output has a lot of files or does not support the full JSON Schema feature set.

## Usage

```sh
npm start -- --tsdir "../src/entity" --jsondir "../schema" --mddir "../docs/reference"
```

The tool takes all TypeScript files from the source directory `tsdir` and outputs a JSON Schema to `jsondir` and a Markdown file to `mddir` for each file. All three options can point to the same folder. It does not do any cleanup, it only overwrites existing files. Types that are referenced from other files are also referenced this way in JSON Schema and Markdown, so that the output is a mirror of the TypeScript files without any duplicate definitions in both JSON Schema and Markdown. Not that all types must be present in the specified directory, otherwise references/links in JSON schema and Markdown will not work.

Usually an error is thrown if the tool encounters an unsupported structure. The only exception from this is that if structures are too deeply nested for Markdown representation, the nested types will be output as formatted JSON schema.

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
