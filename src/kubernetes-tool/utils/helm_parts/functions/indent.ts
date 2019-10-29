import DocumentParser from "../document_parser"
import { Quote } from "../utils"

export default (parser: DocumentParser, args: (string | Quote)[]): string => {
    const toRepeat = " ".repeat(Number(parser.processArg(args[0])))
    const dataSplit = parser.processArg(args[1]).split("\n")
    for (const part in dataSplit) {
        dataSplit[part] = `${toRepeat}${dataSplit[part]}`
    }
    return `\n${dataSplit.join("\n")}`
}
