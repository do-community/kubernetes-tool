import DocumentParser from "../document_parser"
import { Quote } from "../utils"
import escapeStringRegexp from "escape-string-regexp"

export default (parser: DocumentParser, args: (string | Quote)[]): string => {
    const a = parser.processArg(args[0])
    const b = parser.processArg(args[1])
    const c = parser.processArg(args[2])
    return c.replace(new RegExp(escapeStringRegexp(a), "g"), b)
}
