import { Token, Tokeniser } from "./tokeniser"
import { Quote } from "./utils"
import functions from "./functions/index"

// The main document parser.
export default class DocumentParser {
    // Defines the context.
    public context: Record<string, any>
    public templateContext: Record<string, any>
    public variables: Record<string, any>

    // Constructs the class.
    public constructor(context: Record<string, any>) {
        this.context = context
        this.templateContext = {}
        this.variables = {}
    }

    // Handles each specific token.
    private _handleToken(token: Token, additionalQuotes: Quote[]): string {
        // Some initialisation to get the function and arguments.
        const tokens: Token[] = []
        let data = token.data.trim()
        for (;;) {
            const m = data.match(/\((.+?)\)/)
            if (!m) break
            tokens.push(new Token(m[1]))
            data = data.replace(m[0], "__TOKEN")
        }
        const args: (string | Quote)[] = data.split(" ")

        // Handles quotes.
        let quoteParts: {
            index: number;
            part: string;
        }[] = []
        let toQuote: {
            index: number;
            count: number;
            toAdd: Quote;
        }[] = []
        for (const a in args) {
            if (args[a] === "__TOKEN") {
                args[a] = new Quote(this._handleToken(tokens.shift()!, []))
            } else if (typeof args[a] === "string") {
                const strArg = args[a] as string
                if (strArg.startsWith("\"")) {
                    quoteParts.push({
                        index: (a as unknown) as number,
                        part: strArg.substr(1) as string,
                    })
                } else if (strArg.endsWith("\"")) {
                    quoteParts.push({
                        index: (a as unknown) as number,
                        part: strArg.substr(0, strArg.length - 1) as string,
                    })
                    const firstIndex = quoteParts[0].index
                    toQuote.push({
                        index: firstIndex,
                        count: quoteParts.length,
                        toAdd: new Quote(quoteParts.join(" ")),
                    })
                    quoteParts = []
                }
            }
        }
        for (const q of toQuote) args.splice(q.index, q.count, q.toAdd)
        for (const q of additionalQuotes) args.push(q)

        // Gets the function.
        const func: string = args.shift()! as string

        // Runs the function.
        if (functions[func] === undefined) {
            if (func.startsWith(".")) return String(this.helmdef2object(func))
            throw new Error(`${func} - Unknown command!`)
        }
        return functions[func](this, args, token)
    }

    // Handles the tokens and events relating to them.
    public handleTokens(parts: (Token | string)[]): string {
        // The document that will be added to.
        let document = ""

        // Iterates all the parts.
        for (const p of parts) {
            if (typeof p === "string") {
                // Just reapply this. We do not need to worry about it.
                document += p
            } else {
                // It's a token; we need to worry about this.

                // Handles variables.
                let variable: string | undefined
                const s = p.data.split(" ")
                if (s[1] === ":=") {
                    variable = s.shift()!
                    s.shift()
                    p.data = s.join(" ")
                }

                // Handles the tokens.
                if (p.data.includes("|")) {
                    // This includes a pipe.
                    const pipeSplit = p.data.split("|")
                    let lastPart: Quote | undefined
                    for (const part of pipeSplit) {
                        const newToken = new Token(part, p.inner, p.else)
                        const a = []
                        if (lastPart) a.push(lastPart)
                        lastPart = new Quote(this._handleToken(newToken, a))
                    }
                    if (variable) this.variables[variable] = lastPart
                    else document += lastPart
                } else {
                    // There is no pipe.
                    if (variable) this.variables[variable] = this._handleToken(p, [])
                    else document += this._handleToken(p, [])
                }
            }
        }

        // Returns the document.
        return document
    }

    // Evals a document. The result can then be parsed into the Kubernetes parser.
    public eval(document: string): string {
        // Reset the variables.
        this.variables = {}

        // Gets the tokens and handles them.
        return this.handleTokens(new Tokeniser(document).parsed)
    }

    // Maps the Helm definition to a JS object.
    public helmdef2object(definition: string): any {
        // Make it an array and remove any pipes/the first thing which will be whitespace.
        definition = definition.split(/\|/g)[0].trim()
        const defSplit = definition.split(".")
        defSplit.shift()

        // Iterate through the beginning parts.
        let currentCtx = this.context
        for (const part of defSplit) {
            currentCtx = currentCtx[part]
            if (currentCtx === undefined) return undefined
        }

        // Returns the current context.
        return currentCtx
    }

    // Processes an argument.
    public processArg(data: string | Quote): any {
        // If it's a quote, just return it.
        if (typeof data !== "string") return data.text

        // Handles variables.
        if (data.startsWith("$")) return this.variables[data]

        // Handles Helm Definitions.
        if (data.startsWith(".")) return this.helmdef2object(data)

        // Returns the string.
        return data
    }
}
