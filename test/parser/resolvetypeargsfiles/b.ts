import { A } from "./a.js"

export type B<T> = {
  object: A
  value: T
}
