import DocumentParser from "../document_parser"
import { Quote } from "../utils"

export default (parser: DocumentParser, args: (string | Quote)[]): string => {
    const full = parser.processArg(args[0])
    return `<${full} env>`
}
