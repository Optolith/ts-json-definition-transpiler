import ts from "typescript"
import { Doc } from "../ast.js"
import { flattenComment } from "./doccomment.js"
import { parseDocTags } from "./doctags.js"

const isDocEmpty = (doc: Doc): boolean =>
  doc.comment === undefined && Object.keys(doc.tags).length === 0

const parseDoc = (jsDoc: ts.JSDoc | undefined): Doc | undefined => {
  if (jsDoc) {
    const doc: Doc = {
      comment: flattenComment(jsDoc.comment),
      tags: parseDocTags(jsDoc.tags),
    }

    if (!isDocEmpty(doc)) {
      return doc
    }
  }
}

/**
 * Get the JSDoc from a node, if present.
 *
 * @param node - The node to get the JSDoc from.
 * @returns The parsed JSDoc, if any.
 */
export const parseNodeDoc = (node: ts.Node): Doc | undefined =>
  parseDoc(node.getChildren().filter(ts.isJSDoc).slice(-1)[0])

/**
 * Get the JSDoc from the file/module.
 *
 * @param file - The file/module to get the JSDoc from.
 * @returns The parsed JSDoc, if any.
 */
export const parseModuleDoc = (file: ts.SourceFile): Doc | undefined => {
  const firstNode = file.statements[0]

  if (firstNode) {
    if (ts.isImportDeclaration(firstNode)) {
      return parseNodeDoc(firstNode)
    } else {
      const jsDocs = firstNode.getChildren().filter(ts.isJSDoc)

      return jsDocs.length > 1 ? parseDoc(jsDocs[0]) : undefined
    }
  }
}
