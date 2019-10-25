import { Token, Tokeniser } from "./tokeniser"
import { Quote } from "./utils"

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
    private _handleToken(token: Token): string {
        // Some initialisation to get the function and arguments.
        const tokens: Token[] = []
        let data = token.data
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
                args[a] = new Quote(this._handleToken(tokens.shift()!))
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

        // Gets the function.
        const func: string = args.shift()! as string


    }

    // Handles the tokens and events relating to them.
    private _handleTokens(parts: (Token | string)[]) {
        // The document that will be added to.
        let document = ""

        // Iterates all the parts.
        for (const p of parts) {
            if (typeof p === "string") {
                // Just reapply this. We do not need to worry about it.
                document += p
            } else {
                // It's a token; we need to worry about this.
                document += this._handleToken(p)
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
        return this._handleTokens(new Tokeniser(document).parsed)
    }
}
