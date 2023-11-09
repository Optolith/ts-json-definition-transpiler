export const tsextPattern = /(?:\.d)?\.ts$/

export const changeExtension = (
  fileName: string,
  oldExt: string,
  newExt: string
) => fileName.slice(0, -oldExt.length) + newExt
