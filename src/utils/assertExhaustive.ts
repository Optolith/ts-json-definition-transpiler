export function assertExhaustive(
  _x: never,
  msg: string = "The switch is not exhaustive."
): never {
  throw new Error(msg)
}
