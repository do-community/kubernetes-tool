import DocumentParser from "../document_parser"
import { Quote } from "../utils"
import * as printj from "printj"

export default (parser: DocumentParser, args: (string | Quote)[]): string => {
    const formatter = parser.processArg(args.shift()!)
    const transformedArgs: any[] = []
    for (const a of args) transformedArgs.push(parser.processArg(a))
    return printj.sprintf(formatter, ...transformedArgs)
}
