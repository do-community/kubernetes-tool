import DocumentParser from "../document_parser"
import { Quote } from "../utils"
import { Token } from "../tokeniser"

export default (parser: DocumentParser, args: (string | Quote)[], token: Token): string => {
    // Defines all the variables.
    const variables = []

    // Handles parsing the variables.
    if (args.length !== 1) {
        // Gets all the variables.
        for (;;) {
            if (typeof args[0] === "string") {
                let c = args[0] as string
                if (c.endsWith(",")) c = c.substr(0, c.length - 1)
                if (c.startsWith("$")) {
                    args.shift()
                    variables.push(c)
                } else {
                    break
                }
            } else {
                break
            }
        }  

        // Shift out the ":="
        args.shift()
    }

    // Iterates the object.
    const parts = []
    const obj = parser.processArg(args[0]) || {} as any
    for (const k in obj) {
        const i = obj[k]
        if (variables.length === 1) {
            parser.variables[variables[0]] = i
        } else if (variables.length === 2) {
            parser.variables[variables[0]] = k
            parser.variables[variables[1]] = i
        }
        parts.push(parser.handleTokens(token.inner!))
    }

    // Returns all the parts joined.
    return parts.join("")
}
