import DocumentParser from "../document_parser"
import { Quote } from "../utils"
import escapeStringRegexp from "escape-string-regexp"

export default (parser: DocumentParser, args: (string | Quote)[]): string => {
    const a = parser.processArg(args[0])
    const b = parser.processArg(args[args.length - 1])
    const regex = new RegExp(`(^${escapeStringRegexp(a)}+)|(${escapeStringRegexp(a)}+$)`, "g")
    return b.replace(regex, "").replace(/(^\")|(\"$)/g, "")
}
