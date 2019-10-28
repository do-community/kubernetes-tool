import DocumentParser from "../document_parser"
import { Quote } from "../utils"

export default (parser: DocumentParser, args: (string | Quote)[]): string => String(parser.processArg(args[1])).substr(Number(parser.processArg(args[0])))
