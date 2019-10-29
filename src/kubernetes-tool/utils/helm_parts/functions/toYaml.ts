import DocumentParser from "../document_parser"
import { Quote } from "../utils"
import { safeDump } from "js-yaml"

export default (parser: DocumentParser, args: (string | Quote)[]): string => {
    const a = parser.processArg(args[0])
    if (typeof a === "string") return safeDump(a)
    if (typeof a === "boolean") return String(a)
    if (!a) return "null"
    let d = ""
    if (Array.isArray(a)) {
        for (const x of a) {
            d += `- ${safeDump(x)}\n`
        }
        return d
    }
    for (const x in a) {
        let dump = safeDump(a[x]).trim()
        if (a[x] instanceof Object) dump = `\n${dump.match(/ +/) ? dump.match(/ +/)![0] : ""}${dump}`
        d += `${safeDump(x).trim()}: ${dump}\n`
    }
    return d
}
