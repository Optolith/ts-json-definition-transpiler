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

### Supported types

Types may have constraints, which are annotated as JSDoc tags. They may have an associated value.

#### Descriptive tags

Each type supports descriptive tags used in both output formats.

##### `@title`

Not only used for JSON Schema, it is also used for headings in Markdown.

##### Description

The JSDoc comment itself is used as the value `description` in JSON Schema and also precedes any details in Markdown

#### String

##### Supported tags

- `@minLength` — `integer`
- `@maxLength` — `integer`

#### Number

##### Supported tags

- `@integer` If this tag is present, the number is output as an integer and other tags related to the value are also interpreted as integers.
- `@minimum` — `integer/number`
- `@maximum` — `integer/number`

#### Array

##### Supported tags

- `@minItems` — `integer`
- `@maxItems` — `integer`
- `@uniqueItems`

#### Object

An object with strict properties cannot have indexed properties at the same time.

##### Supported tags

None.

#### Dictionary

An object with indexed properties cannot have strict properties at the same time.

##### Supported tags

This is used for indexed properties.

- `@minProperties`

##### Pattern Dictionary

Pattern properties are annotated using `@patternProperties`. The value of this annotation is the pattern that should be used for the indexed properties. It is annotated on the indexed property definition, not the object itself.

Example:

```ts
/**
 * @minProperties 1
 */
type IndexedObject = {
  /**
   * @patternProperties ^KEY_[1-9]$
   */
  [key: string]: number
}
```

#### Literals

Strings, numbers and boolean values are supported.
