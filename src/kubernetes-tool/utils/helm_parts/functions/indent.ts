import DocumentParser from "../document_parser"
import { Quote } from "../utils"

export default (parser: DocumentParser, args: (string | Quote)[]): string => `${" ".repeat(Number(parser.processArg(args[0])))}${parser.processArg(args[1])}`
