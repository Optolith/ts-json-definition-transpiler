#!/usr/bin/env node
import { watch } from "node:fs/promises"
import { resolve } from "node:path"
import { argv, cwd } from "node:process"
import { pathToFileURL } from "node:url"
import { GeneratorOptions, generate } from "../main.js"

const cliOptions = argv
  .slice(2)
  .reduce<[lastOption: string | undefined, options: Map<string, string[]>]>(
    ([lastOption, map], arg) => {
      if (/^-{1,2}/.test(arg)) {
        return [arg, map.set(arg, [])]
      } else if (lastOption) {
        return [undefined, map.set(lastOption, [...map.get(lastOption)!, arg])]
      } else {
        return [undefined, map]
      }
    },
    [undefined, new Map()]
  )[1]

const optionsPath = resolve(
  cwd(),
  cliOptions.get("-c")?.[0] ??
    cliOptions.get("--config")?.[0] ??
    "otjsmd.config.js"
)

const options = (await import(pathToFileURL(optionsPath).toString()))
  .default as GeneratorOptions

if (cliOptions.has("-w") || cliOptions.has("--watch")) {
  try {
    generate(options)
  } catch (err) {
    console.error(err)
  } finally {
    console.log("Watching for changes ...")

    const generate$ = debounce(generate, 300)

    for await (const _ of watch(options.sourceDir, { recursive: true })) {
      try {
        generate$(options)
      } catch (err) {
        console.error(err)
      }
    }
  }
} else {
  generate(options)
}

function debounce<T extends any[]>(
  this: any,
  f: (...args: T) => void,
  timeout: number
): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      f.apply(this, args)
    }, timeout)
  }
}
