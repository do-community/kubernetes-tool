import DocumentParser from "../document_parser"
import { Quote } from "../utils"
import { Token } from "../tokeniser"

export default (parser: DocumentParser, args: (string | Quote)[], token: Token): string => {
    const full = parser.processArg(args[0])
    parser.templateContext[full] = parser.handleTokens(token.inner!)
    return ""
}
