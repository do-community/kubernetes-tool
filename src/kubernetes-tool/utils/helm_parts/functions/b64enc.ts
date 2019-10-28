import DocumentParser from "../document_parser"
import { Quote } from "../utils"

export default (parser: DocumentParser, args: (string | Quote)[]): string => btoa(parser.processArg(args[0]))
