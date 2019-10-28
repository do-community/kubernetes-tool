import DocumentParser from "../document_parser"
import { Quote } from "../utils"

export default (parser: DocumentParser, args: (string | Quote)[]): string => {
    for (const a of args.reverse()) {
        if (a === "-") continue
        const argument = parser.processArg(a)
        if (argument) return String(argument)
    }

    // It can't hit here, but the IDE doesn't know that.
    return ""
}
