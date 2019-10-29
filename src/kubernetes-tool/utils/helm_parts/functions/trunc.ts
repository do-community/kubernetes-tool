import DocumentParser from "../document_parser"
import { Quote } from "../utils"

export default (parser: DocumentParser, args: (string | Quote)[]): string => {
    const trunced = String(
        parser.processArg(args[1])
    ).substr(0, Number(parser.processArg(args[0])))
    return trunced
}
