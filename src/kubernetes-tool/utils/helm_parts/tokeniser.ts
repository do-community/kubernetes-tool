import { helmStatement } from "./utils"

// Defines the token.
export class Token {
    public data?: string
    public inner?: (Token | string)[]
    public else?: Token[]

    public constructor(data?: string, inner?: (Token | string)[], _else?: Token[]) {
        this.data = data
        this.inner = inner
        this.else = _else
    }
}

// Handles tokenisation.
export class Tokeniser {
    public document: string
    public parsed: (Token | string)[]

    public constructor(document: string) {
        this.document = document
        this.parsed = []
        this._handle(document, this._matchAllArray(document), this.parsed)
    }

    // Matches all statements into a array.
    private _matchAllArray(document: string) {
        const all = document.matchAll(helmStatement)
        const arr = []
        for (;;) {
            const r = all.next()
            if (r.done) break
            arr.push(r.value)
        }
        return arr
    }

    // Finds the end statement.
    private _manageEnd(matches: RegExpMatchArray[]): RegExpMatchArray[] | undefined {
        // Tells the parser to skip the next end.
        let skip = false

        // Contains either 1 end, or else's and a end.
        const returned = []

        // Iterates all of the matches.
        for (;;) {
            const m = matches.shift()
            if (!m) break
            const t = m[1].split(/ +/g)[0].toLowerCase()
            if (["if", "range"].includes(t)) {
                skip = true
            } else if (t === "else") {
                if (!skip) returned.push(m)
            } else if (t === "end") {
                if (skip) {
                    skip = false
                } else {
                    returned.push(m)
                    return returned
                } 
            }
        }
    }

    // The main parser.
    private _handle(document: string, all: RegExpMatchArray[], parsed: (string | Token)[]) {
        // The index that has been parsed.
        let doneIndex = 0

        for (;;) {
            // Get the match (it needs to be done like this since the array changes size).
            const match = all.shift()
            if (!match) break

            // Get any parts of the document before this but after the last match and put them in the array. 
            const b = document.substr(doneIndex, match.index! - doneIndex)
            if (b !== "") parsed.push(b)

            // Make the done index the index of this match plus the match length minus 1 since indexes start from 0.
            doneIndex = match.index! + match[0].length

            // If this is a if/range statement, we need to do some special stuff to get the end.
            if (["if", "range"].includes(match[1].split(" ")[0].toLowerCase())) {
                // Gets the end and any elses (right now, this variable name is misleading - in a few lines it won't be).
                const elses = this._manageEnd(all)

                // If the end is not found, throw a error.
                if (!elses) throw new Error(`${match[0]} - End not found!`)

                // Gets the end.
                const end = elses.pop()!

                if (elses.length === 0) {
                    // Pushes the token with the if statement (NO elses though).

                    // Start: Match index + the match length.
                    const start = match.index! + match[0].length

                    const innerDoc = document.substr(
                        start,

                        // Length: End index minus the start.
                        end.index! - start
                    )
                    const innerParsed: (string | Token)[] = []
                    this._handle(innerDoc, this._matchAllArray(innerDoc), innerParsed)
                    parsed.push(new Token(match[1], innerParsed))
                } else {
                    // Handle any else statements there.

                    // Deal with the initialisation of the token firstly.
                    const ifTokenStart = match.index! + match[0].length
                    const ifTokenInner = document.substr(
                        ifTokenStart,

                        // Length: First else index minus the start.
                        elses[0].index! - ifTokenStart
                    )
                    const ifInnerParsed: (string | Token)[] = []
                    this._handle(ifTokenInner, this._matchAllArray(ifTokenInner), ifInnerParsed)
                    const token = new Token(match[1], ifInnerParsed, [])

                    // Alright! Lets handle the else statements.
                    for (;;) {
                        // Get the else statement.
                        const else_ = elses.shift()
                        if (!else_) break

                        // Gets the start index of the else statement.
                        const elseStart = else_.index! + else_[0].length

                        // Get the length of the else statement.
                        const elseLen = (elses[0] === undefined ? end.index! : elses[0].index!) - elseStart

                        // Get the part of the document relating to this statement.
                        const elseDoc = document.substr(elseStart, elseLen)

                        // Create the parsed inner.
                        const innerParsed: (string | Token)[] = []
                        this._handle(elseDoc, this._matchAllArray(elseDoc), innerParsed)
                        token.else!.push(new Token(else_[1], innerParsed))
                    }

                    // Push the token to the array.
                    parsed.push(token)
                }

                // Set the done index to after the end (we don't want any inner contents being recaptured).
                doneIndex = end.index! + end[0].length
            } else {
                // This is just a token. Handle this.
                parsed.push(new Token(match[1]))
            }
        }

        // Handle the remainder of the document.
        const remainder = document.substr(doneIndex)
        if (remainder !== "") parsed.push(remainder)
    }
}
