/*
Copyright 2019 DigitalOcean

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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
        let data = token.data.trim()
        const args: (string | Quote)[] = []

        // Handles brackets in the tool.
        let dSplit: (string | Quote)[] = [data]
        for (;;) {
            const results: boolean[] = []
            const newdSplit: (string | Quote)[] = []
            for (const d of dSplit) {
                if (typeof d !== "string") {
                    results.push(true)
                    newdSplit.push(d)
                    continue
                }
                const m = d.match(/\((.+?)\)/)
                if (!m) {
                    results.push(true)
                    newdSplit.push(d)
                    continue
                }
                if (m) {
                    const remainingData = d.split(m[0])
                    const before = remainingData[0]
                    const after = remainingData[1]
                    const middle = new Quote(this._handleToken(new Token(m[1]), []))
                    newdSplit.push(before, middle, after)
                    results.push(false)
                }
            }
            dSplit = newdSplit
            if (results.every(x => x)) break
        }

        // Splits the data properly.
        for (const d of dSplit) {
            if (typeof d === "string") {
                const split = d.split(" ")
                for (const s of split) args.push(s)
            } else {
                args.push(d)
            }
        }

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
            if (typeof args[a] === "string") {
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
        let func = args.shift()! as string
        if (((func as unknown) as Quote).text) {
            func = ((func as unknown) as Quote).text
        }

        // Runs the function.
        if (functions[func] === undefined) {
            if (func.startsWith(".")) return String(this.helmdef2object(func))

            // We should return here because even though this may not be fully accurate, it allows for an as accurate as possible result.
            return ""
        }
        const exec = functions[func](this, args, token)
        return exec
    }

    // Handles the tokens and events relating to them.
    public handleTokens(parts: (Token | string)[]): string {
        // The document that will be added to.
        let document = ""

        // Iterates all the parts.
        for (const p of parts) {
            if (typeof p === "string") {
                // Just reapply this. We do not need to worry about it other than trimming blank lines.
                document += p.replace(/\n+$/g, "")
            } else {
                // It's a token; we need to worry about this.

                // Handles variables.
                let variable: string | undefined
                let s = p.data.split(" ")
                let a = 0
                for (;;) {
                    if (!s[a]) break
                    if (s[a] === "-") delete s[a]
                    a++
                }
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
                    if (variable) this.variables[variable] = lastPart!.text
                    else document += lastPart!.text
                } else {
                    // There is no pipe.
                    const tokenRes = this._handleToken(p, [])
                    if (variable) this.variables[variable] = tokenRes
                    else document += tokenRes
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
