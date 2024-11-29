# JSON Schema

Generates a JSON Schema document for every source file. JSDoc comments are used to provide additional information for JSON Schemas.

## Options

Options are provided as an object to the renderer function.

- `allowAdditionalProperties`
  - **Description:** Whether to allow unresolved additional keys in object definitions. This sets the `additionalProperties` JSON Schema keyword for all applicable types.
  - **Required:** no
  - **Type:** `boolean`
  - **Default:** `false`
- `spec`
  - **Description:** The JSON Schema specification to use.
  - **Required:** no
  - **Type:** `JsonSchemaSpec`
  - **Default:** `"Draft_2020_12"`

## Main type

A module comment may indicate the main type of the module, which can be used by directly importing the JSON Schema without the need to specify the definition inside. The type is referenced to by its name.

Example:

```ts
/**
 * @main Attribute
 */
```

If no `@main` attribute is present, a default export is used as a fallback.

## Supported JSDoc features

JSDoc | JSON Schema
:-- | :--
Description | `description` keyword
`@title` | `title` keyword
`@default` | `default` keyword
`@deprecated` | `deprecated` keyword (since `"Draft_2019_09"`)
`@markdown` | —
`@minLength` | `minLength` keyword
`@maxLength` | `maxLength` keyword
`@pattern` | `pattern` keyword
`@format` | `format` keyword
`@integer` | `"type": "integer"` instead of `"type": "number"`
`@minimum` | `minimum` keyword
`@maximum` | `maximum` keyword
`@exclusiveMinimum` | `exclusiveMinimum` keyword
`@exclusiveMaximum` | `exclusiveMaximum` keyword
`@multipleOf` | `multipleOf` keyword
`@minItems` | `minItems` keyword
`@maxItems` | `maxItems` keyword
`@uniqueItems` | `uniqueItems` keyword
`@minProperties` | `minProperties` keyword
`@maxProperties` | `maxProperties` keyword
`@patternProperties` | `patternProperties` keyword
`readonly` modifier | `readOnly` keyword
