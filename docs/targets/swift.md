# Swift

Generates a Swift file for every source file, creating types and optionally initializers and decoders for the corresponding JSON structures.

## Options

Options are provided as an object to the renderer function.

- `addConformances`
  - **Description:** Conformances to add to generated types.
  - **Required:** no
  - **Type:** `ConformanceOptions[]`
  - **Default:** `[]`
- `convertIdentifiersToNamingConvention`
  - **Description:** If generated type and member names’ casing should be converted to Swift conventions.
  - **Required:** no
  - **Type:** `boolean`
  - **Default:** `false`
- `decodableSynthesization`
  - **Description:** If generated `struct` types should have `Decodable` conformances.
  - **Required:** no
  - **Type:** `DecodableSynthesizationOptions`
  - **Default:** `undefined`
- `defaultPublic`
  - **Description:** If generated types and members should be `public`.
  - **Required:** no
  - **Type:** `boolean`
  - **Default:** `false`
- `forceConstantStructMembers`
  - **Description:** If `struct` members are always generated as `let`. This ignores the `isReadOnly` AST flag.
  - **Required:** no
  - **Type:** `boolean`
  - **Default:** `false`
- `generateStructInitializers`
  - **Description:** If generated `struct` types should have initializers generated. Initializers will have default `nil` values for optional members.
  - **Required:** no
  - **Type:** `boolean`
  - **Default:** `false`
- `packageName`
  - **Description:** The package name to use in all file comments.
  - **Required:** yes
  - **Type:** `string`
  - **Default:** —

### `DecodableSynthesizationOptions`

- `discriminatorKey`
  - **Description:** For enumerations with associated values, the key of the discriminator property.
  - **Required:** yes
  - **Type:** `string`
  - **Default:** —

### `ConformanceOptions`

- `identifier`
  - **Description:** The identifier of the type to add.
  - **Required:** yes
  - **Type:** `string | (( node: RecordNode | UnionNode | EnumerationNode | TypeParameterNode ) => string)`
  - **Default:** —
- `includesDecodable`
  - **Description:** If the type includes `Decodable` conformance, which will not add an additional `Decodable` conformance if `decodableSynthesization` is used.
  - **Required:** no
  - **Type:** `boolean`
  - **Default:** `false`
- `forMainTypes`
  - **Description:** If set, whether the type is only for main types (`true`) or sub types (`false`).
  - **Required:** no
  - **Type:** `boolean`
  - **Default:** `undefined`

## Supported JSDoc features

JSDoc | Swift
:-- | :--
Description | Documentation comment
`@title` | —
`@default` | —
`@deprecated` | Deprecation annotation
`@markdown` | —
`@minLength` | —
`@maxLength` | —
`@pattern` | —
`@format` | —
`@integer` | Type: `Int`
`@minimum` | —
`@maximum` | —
`@exclusiveMinimum` | —
`@exclusiveMaximum` | —
`@multipleOf` | —
`@minItems` | —
`@maxItems` | —
`@uniqueItems` | —
`@minProperties` | —
`@maxProperties` | —
`@patternProperties` | —
`readonly` modifier | `let` variable member
