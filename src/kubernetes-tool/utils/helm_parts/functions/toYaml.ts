import DocumentParser from "../document_parser"
import { Quote } from "../utils"
import { safeDump } from "js-yaml"

export default (parser: DocumentParser, args: (string | Quote)[]): string => safeDump(parser.processArg(args[0]))
