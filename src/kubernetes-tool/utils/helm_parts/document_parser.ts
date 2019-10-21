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

// Imports stuff which is needed.
import { Quote, OperatorManager, helmStatement } from "./utils"
import * as semver from "semver"
import * as printj from "printj"
import { safeDump } from "js-yaml"
import escapeStringRegexp from "escape-string-regexp"

// The Helm document parser.
export default class HelmDocumentParser {
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

    // Finds the end statement.
    private _findEnd(document: string, match: RegExpMatchArray): {
        length: number;
        endIndex: number;
    } {
        const m = document.match(/{{[ -]*(?:if|range)[^}]*}}(?:.|[\r\n])+({{[ -]*end[ -]*}})/)
        if (!m) throw new Error(`${match[0]} - No "end" found to this statement!`)
        return {
            length: m[1].length,
            endIndex: m.index! + m[0].length,
        }
    }

    // Crops out a part of a document.
    private _crop(data: string, start: number, end: number): {
        cropped: string;
        beforeRegion: string;
        afterRegion: string;
    } {
        return {
            cropped: data.substr(start, end).trimStart(),
            afterRegion: data.substr(end, data.length),
            beforeRegion: data.substr(0, start).replace(/\n$/g, ""),
        }
    }

    // Maps the Helm definition to a JS object.
    private _helmdef2object(definition: string): any {
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

    // Checks the condition given by doing some basic parsing.
    private _checkCondition(args: (string | Quote)[] | undefined): boolean {
        // Return true if undefined.
        if (!args) return true

        // Split this condition.
        const conditionSplit: (string | Quote)[] = []
        for (const a of args) {
            if (a !== "") conditionSplit.push(a)
        }

        // Check the operator if it exists.
        let operator = conditionSplit.shift()!

        // Not is a special edgecase! It goes up here due to that.
        let not = false

        // Does one string contain another?
        let contain = true

        // Is this a semver check?
        let semverFlag = false

        // Is this a empty check?
        let empty = false

        // Is this a include?
        let include = false

        // Check/set what the operator is. Can be eq, ne, lt, gt, and, or, not or a boolean value (ref: https://helm.sh/docs/chart_template_guide/#operators-are-functions)
        switch (operator) {
            case "eq": {
                operator = "==="
                break
            }
            case "ne": {
                operator = "!=="
                break
            }
            case "lt": {
                operator = "<"
                break
            }
            case "gt": {
                operator = ">"
                break
            }
            case "and": {
                operator = "&&"
                break
            }
            case "or": {
                operator = "||"
                break
            }
            case "not": {
                not = true
                break
            }
            case "contains": {
                contain = true
                break
            }
            case "semverCompare": {
                semverFlag = true
                break
            }
            case "empty": {
                empty = true
                break
            }
            case "include": {
                include = true
                break
            }
            default: {
                if (typeof operator === "string" && operator.startsWith(".")) {
                    // This *should* be the condition.
                    return Boolean(this._helmdef2object(operator))
                } else {
                    throw new Error(`"${operator}" - Invalid operator!`)
                }
            }
        }

        // Each part in a easy to iterate array. Makes the next part a lot easier.
        const dataParts: any[] = []

        // Goes through each part applying the rule above.
        for (;;) {
            const arg = conditionSplit.shift()
            if (arg === undefined) break

            if (typeof arg === "string") {
                if (arg.startsWith("(")) {
                    // Inline function! Get the bits inbetween.
                    const argParts = []
                    if (arg.endsWith(")")) {
                        argParts.push(arg.substr(1, arg.length - 2))
                    } else {
                        // Get any related arguments.
                        argParts.push(arg.substr(1))
                        for (;;) {
                            const item = conditionSplit.shift()
                            if (item === undefined) {
                                throw new Error(`"${arg}" - Unterminated brackets!`)
                            } else {
                                if (typeof item === "string" && item.endsWith(")")) {
                                    argParts.push(item.substr(0, arg.length - 2))
                                    break
                                } else {
                                    argParts.push(item)
                                }
                            }
                        }
                    }

                    dataParts.push(this._checkCondition(argParts))
                    continue
                }
    
                if (arg.startsWith(".")) {
                    // Get the attribute.
                    dataParts.push(this._helmdef2object(arg))
                    continue
                }
            } else {
                // Is a quote.
                dataParts.push(arg.text)
                continue
            }

            // Whayyyyyyyyyyyt.
            if (arg !== "-") throw new Error(`"${arg}" - Invalid argument!`)
        }

        // Handles include.
        if (include) return dataParts[0]

        // Handles semver.
        if (semverFlag) return semver.eq(dataParts[0], dataParts[1])

        // If this is a not statement, we only need to worry about the first arg.
        if (not) return !Boolean(dataParts[0])

        // Check if one contains the other.
        if (contain) return String(dataParts[0]).includes(dataParts[1])

        // Check if any of the things are blank.
        if (empty) {
            empty = false
            for (const p of dataParts) {
                if (String(p) === "") empty = true
            }
            return empty
        }

        // Get the final result.
        let final = true
        let last: any = undefined
        for (const i of dataParts) {
            const currentLast = last
            last = i
            if (currentLast === undefined) continue
            const op = new OperatorManager(last, i, operator)
            final = op.call()
        }
        return final
    }

    // Handles range statements.
    private _handleRangeBlock(condition: (string | Quote)[], block: string, rangeLength: number, endLength: number): string {
        // Remove the range/end statement from the block.
        const start = block.length - rangeLength
        block = block.substr(start)
        block = block.substr(0, block.length - endLength).trim()

        // Defines all the variables.
        const variables = []

        if (condition.length !== 1) {
            // Gets all the variables.
            for (;;) {
                if (typeof condition[0] === "string") {
                    let c = condition[0] as string
                    if (c.endsWith(",")) c = c.substr(0, c.length - 1)
                    if (c.startsWith("$")) {
                        condition.shift()
                        variables.push(c)
                    } else {
                        break
                    }
                } else {
                    break
                }
            }  

            // Shift out the ":="
            condition.shift()
        }

        // Iterates the object.
        const parts = []
        const obj = this._helmdef2object(condition[0] as string) || {}
        for (const k in obj) {
            const i = obj[k]
            if (variables.length === 1) {
                this.variables[variables[0]] = i
            } else if (variables.length === 2) {
                this.variables[variables[0]] = k
                this.variables[variables[1]] = i
            }
            parts.push(this._eval(block))
        }

        // Returns all the parts joined.
        return parts.join("")
    }

    // Handles if statements.
    private _handleIfBlock(condition: (string | Quote)[], block: string, ifStatement: string, endLength: number): string {
        // Remove the if/end statement from the block.
        block = block.substr(ifStatement.length)
        block = block.substr(0, block.length - endLength).trim()

        // This array will be full of else statements.
        // condition [string | undefined] - The condition to trigger the else statement. Can be none.
        // block [string] - The block to be returned.
        const elses: {
            condition: (string | Quote)[] | undefined;
            block: string;
        }[] = []

        // Gets the if spacing.
        const ifSpacingMatch = block.match(new RegExp(`^( *){{[ -]*if([^}]*)[ -]*}}`, "m"))
        let spacing = ""
        if (ifSpacingMatch) spacing = ifSpacingMatch[1]

        // Recreates the else block.
        let matchIterator = block.matchAll(new RegExp(`^${spacing}{{[ -]*(?:end|else)([^}]*)[ -]*}}`, "m"))
        const matches = []
        let recreatedBlock = ""
        for (;;) {
            const n = matchIterator.next()
            if (n.done) break
            matches.push(n.value)
        }
        for (const m of matches) {
            const index = m.index!
            const innerMatch = m[1].split(" ")
            if (innerMatch[0] === "end") {
                // Remove this end.
                const { beforeRegion, afterRegion } = this._crop(block, index, m[0].length)
                block = `${beforeRegion}${afterRegion}`
            } else {
                // Handles the else statement.
                innerMatch.shift()
                const end = block.substr(index + m[0].length)
                if (innerMatch.length === 0) {
                    elses.push({
                        block: end,
                        condition: undefined,
                    })
                } else {
                    innerMatch.shift()
                    elses.push({
                        block: end,
                        condition: this._parseArgs(innerMatch),
                    })
                }
            }
        }

        // Lets check the condition; if it fails, we will iterate elses.
        if (this._checkCondition(condition)) {
            return recreatedBlock
        } else {
            for (const else_ of elses) {
                if (else_.condition && else_.condition.length === 0) else_.condition = undefined
                if (this._checkCondition(else_.condition)) return else_.block
            }

            // Return a empty string.
            return ""
        }
    }

    // Quotes the string.
    private _quote(data: string): string {
        return JSON.stringify(data)
    }

    // Parses any args in the string.
    private _parseArgs(args: string[]) {
        // Defines the parsed arguments.
        const parsedArgs: (string | Quote)[] = []

        // Defines the buffer.
        let buffer: string[] = []

        // Handles the arguments.
        for (const a of args) {
            if (buffer.length !== 0) {
                // A non-empty buffer! Does it end with a string?
                if (a.endsWith('"')) {
                    buffer.push(a.substr(0, a.length - 1))
                    parsedArgs.push(new Quote(buffer.join(" ")))
                    buffer = []
                    continue
                }
            }

            if (a.startsWith('"')) {
                // The start of the quote.
                if (a.endsWith('"')) parsedArgs.push(new Quote(a.substr(1, a.length - 2)))
                else buffer.push(a.substr(1))
            } else {
                parsedArgs.push(a)
            }
        }

        // Add the buffer to the args.
        if (buffer.length !== 0) parsedArgs.push(new Quote(buffer.join(" "))) 

        // Returns the parsed args.
        return parsedArgs
    }

    // Executes a statement.
    private _execStatement(statement: string, match: RegExpMatchArray, document: string, args: (string | Quote)[]) {
        switch (statement) {
            case "env": {
                // Gets a enviroment variable.
                const startIndex = match.index!
                const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                let toQuote = ""
                let a = args[0]
                if (typeof a === "string") {
                    // HACK: TypeScript does not understand typeof very well.
                    a = (a as unknown) as string
                    if (a.startsWith("$")) toQuote = this.variables[a]
                    else toQuote = this._helmdef2object(a)
                } else {
                    // HACK: TypeScript does not understand typeof very well.
                    a = (a as unknown) as Quote
                    toQuote = a.text
                }
                return `${beforeRegion}<${toQuote} env>${afterRegion}` 
            }
            case "uuidv4": {
                // Makes a UUID.
                const startIndex = match.index!
                const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                return `${beforeRegion}<randomly generated UUID>${afterRegion}` 
            }
            case "trimSuffix": {
                // Trims the suffix given.
                let a = args[0]
                if (typeof a === "string") {
                    if (a.startsWith(".")) a = this._helmdef2object(a)
                    else if (a.startsWith("$")) a = this.variables[a]
                } else {
                    a = a.text
                }
                a = a as string
                let b = args[1]
                if (typeof b === "string") {
                    if (b.startsWith(".")) b = this._helmdef2object(b)
                    else if (b.startsWith("$")) b = this.variables[b]
                } else {
                    b = b.text
                }
                b = b as string
                const regex = new RegExp(`(^${escapeStringRegexp(a)}+)|(${escapeStringRegexp(a)}+$)`, "g")
                const startIndex = match.index!
                const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                return `${beforeRegion}${b.replace(regex, "")}${afterRegion}` 
            }
            case "if": {
                // Defines the if statement.
                const startIndex = match.index!
                const { length, endIndex } = this._findEnd(document, match)
                const { cropped, beforeRegion, afterRegion } = this._crop(document, startIndex, endIndex)
                return `${beforeRegion}${this._handleIfBlock(args, cropped, match[0], length)}${afterRegion}`
            }
            case "range": {
                // Defines the range statement.
                const startIndex = match.index!
                const { length, endIndex } = this._findEnd(document, match)
                const { cropped, beforeRegion, afterRegion } = this._crop(document, startIndex, endIndex)
                return `${beforeRegion}${this._handleRangeBlock(args, cropped, match[0].length, length)}${afterRegion}`
            }
            case "else": {
                // This needs to be in a if statement.
                throw new Error(`${match[0]} - This should be in a if statement!`)
            }
            case "end": {
                // End needs to follow a valid operator!
                return ""
            }
            case "default": {
                // Defines the default of a thing.
                for (const a of args.reverse()) {
                    if (a === "-") continue
                    let res
                    if (typeof a === "string") res = this._helmdef2object(a)
                    else res = a.text
                    if (res) {
                        const startIndex = match.index!
                        const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                        return `${beforeRegion}${res}${afterRegion}`
                    }
                }
                throw new Error(`${match[0]} - Cannot set a default!`)
            }
            case "quote": {
                // Defines the function to quote all the things.
                let a = args[0]
                let toQuote = ""
                if (typeof a === "string") {
                    // HACK: TypeScript does not understand typeof very well.
                    a = (a as unknown) as string
                    if (a.startsWith("$")) toQuote = this.variables[a]
                    else toQuote = this._helmdef2object(a)
                } else {
                    // HACK: TypeScript does not understand typeof very well.
                    a = (a as unknown) as Quote
                    toQuote = a.text
                }
                const startIndex = match.index!
                const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                return `${beforeRegion}${this._quote(toQuote)}${afterRegion}`
            }
            case "define": {
                // Defines an item.
                const startIndex = match.index!
                const { endIndex: beforeEndIndex } = this._findEnd(document, match)
                let { cropped, beforeRegion, afterRegion } = this._crop(document, startIndex, beforeEndIndex)
                const m = cropped.match(/{{[ -]*end[ -]*}}/)
                cropped = cropped.substr(0, m!.index!).substr(match[0].length).trim()
                let arg
                if (typeof args[0] === "string") arg = args[0]
                else arg = (args[0] as Quote).text
                this.templateContext[arg as string] = this._eval(cropped)
                return `${beforeRegion}${afterRegion}`
            }
            case "template": {
                // Defines an existing template.
                const startIndex = match.index!
                const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                let arg
                if (typeof args[0] === "string") arg = args[0]
                else arg = (args[0] as Quote).text
                return `${beforeRegion}${this.templateContext[arg as string]}${afterRegion}`
            }
            case "trunc": {
                // Handles truncation.
                const integer = Number(args.shift()!)
                if (integer === NaN) throw new Error(`${match[0]} - Truncation value not a number!`)
                if (typeof args[0] === "string") {
                    throw new Error(`${match[0]} - Value to truncate must be a quote.`)
                } else {
                    const startIndex = match.index!
                    const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                    return `${beforeRegion}${(args[0] as Quote).text.substr(0, integer)}${afterRegion}`
                }
            }
            case "indent": {
                // Indents by X number of spaces.
                const integer = Number(args.shift()!)
                if (integer === NaN) throw new Error(`${match[0]} - Truncation value not a number!`)
                if (typeof args[0] === "string") {
                    throw new Error(`${match[0]} - Value to truncate must be a quote.`)
                } else {
                    let indentedText = ""
                    for (const part of (args[0] as Quote).text.split(" ")) {
                        indentedText += " ".repeat(integer) + part
                    }
                    const startIndex = match.index!
                    const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                    return `${beforeRegion}${indentedText}${afterRegion}`
                }
            }
            case "toYaml": {
                // Takes a value and dumps it into YAML.
                let yaml = ""
                const arg = args[0]
                if (typeof arg === "string") {
                    if (arg.startsWith("$")) {
                        yaml = safeDump(this.variables[arg])
                    } else {
                        const helmDump = this._helmdef2object(arg)
                        yaml = safeDump(helmDump === undefined ? null : helmDump)
                    }
                } else {
                    yaml = safeDump(arg.text)
                }
                const startIndex = match.index!
                const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                return `${beforeRegion}${yaml}${afterRegion}`
            }
            case "printf": {
                // Handles printf.
                let formatter = args.shift()!
                if (typeof formatter === "string") throw new Error("Formatter must be a quote!")
                
                // HACK: TypeScript does not understand typeof very well.
                formatter = (formatter as unknown) as Quote

                const transformedArgs: string[] = []
                for (let part of args) {
                    if (typeof part === "string") {
                        // HACK: TypeScript does not understand typeof very well.
                        part = (part as unknown) as string
                        if (part.startsWith("$")) transformedArgs.push(this.variables[part])
                        else transformedArgs.push(this._helmdef2object(part))
                    } else {
                        // HACK: TypeScript does not understand typeof very well.
                        part = (part as unknown) as Quote

                        transformedArgs.push(part.text)
                    }
                }

                const formatted = printj.sprintf(formatter.text, ...transformedArgs)
                const startIndex = match.index!
                const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                return `${beforeRegion}${formatted}${afterRegion}`
            }
            case "include": {
                // Handle include here too.
                const join = match[1].trim()
                let item
                if (join.startsWith(".")) item = this._helmdef2object(join)
                else if (join.startsWith("$")) item = this.variables[join]
                const startIndex = match.index!
                const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                return `${beforeRegion}${item}${afterRegion}` 
            }
            case "replace": {
                let a = args[0]
                if (typeof a === "string") {
                    if (a.startsWith(".")) a = this._helmdef2object(a)
                    else if (a.startsWith("$")) a = this.variables[a]
                } else {
                    a = a.text
                }
                a = a as string
                let b = args[1]
                if (typeof b === "string") {
                    if (b.startsWith(".")) b = this._helmdef2object(b)
                    else if (b.startsWith("$")) b = this.variables[b]
                } else {
                    b = b.text
                }
                b = b as string
                let c = args[2]
                if (typeof c === "string") {
                    if (c.startsWith(".")) c = this._helmdef2object(c)
                    else if (c.startsWith("$")) c = this.variables[c]
                } else {
                    c = c.text
                }
                c = c as string
                const startIndex = match.index!
                const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                return `${beforeRegion}${c.replace(new RegExp(escapeStringRegexp(a), "g"), b)}${afterRegion}` 
            }
            default: {
                // Not a statement, is it a definition?
                const join = match[1].trim()
                if (join.startsWith("/*")) {
                    // This is a comment. Remove/break here.
                    const startIndex = match.index!
                    const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                    return `${beforeRegion}${afterRegion}`
                }
                if (!join.startsWith(".")) throw new Error(`${match[0]} (${statement}) - Invalid definition!`)
                const startIndex = match.index!
                const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                const d = this._helmdef2object(join)
                return `${beforeRegion}${d === undefined ? `<${join} is undefined>` : d}${afterRegion}`
            }
        }
    }

    // Handles pipes.
    private _handlePipe(bundles: (string | Quote)[][], match: RegExpMatchArray) {
        let last = undefined
        for (const bundle of bundles) {
            const cmd = bundle.shift()! as string
            if (last) bundle.push(new Quote(last))
            last = this._execStatement(cmd, match, "", bundle)
        }
        return last
    }

    // Used for recalling the eval stuff locally without reinitialising all the things.
    private _eval(document: string): string {
        // Look for any statements in the document.
        for (;;) {
            if (!document) document = ""
            let matchIterator = document.matchAll(helmStatement)
            const matches = []
            for (;;) {
                const n = matchIterator.next()
                if (n.done) break
                matches.push(n.value)
            }
            let match
            for (const n of matches) {
                if (n[1].match(/^[ -]*(?:else|end).*/g)) {
                    if (matches.length === 1 && n[1].match(/^[ -]*end.*/g)) {
                        document = document.substr(0, n.index!)    
                    } else {
                        continue
                    }
                }
                match = n
                break
            }
            if (!match) break
            const args = match[1].trim().split(" ")

            // Defines the dollar variable being set.
            let inDollarContext = undefined
            if (args[0][0] === "$") {
                inDollarContext = args.shift()!
                const startIndex = match.index!
                const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length) 
                if (args.length === 0) {
                    // Output the variable.
                    document = `${beforeRegion}${this.context[inDollarContext]}${afterRegion}`
                    continue
                } else {
                    // Hide this!
                    document = `${beforeRegion}${afterRegion}`
                }
                args.shift()
            }

            if (args.includes("|")) {
                // We need to pipe all the things down the argument chain
                const bundles: (string | Quote)[][] = []
                let buffer: string[] = []
                for (const a of args) {
                    if (a !== " " && a !== "-") {
                        if (a === "|") {
                            bundles.push(buffer)
                            buffer = []
                        } else {
                            buffer.push(a)
                        }
                    }
                }
                if (buffer.length !== 0) {
                    bundles.push(buffer)
                    buffer = []
                }
                for (const bundleIndex in bundles) bundles[bundleIndex] = this._parseArgs(bundles[bundleIndex] as string[])
                const startIndex = match.index!
                const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                const pipeHandler = this._handlePipe(bundles, match)
                if (inDollarContext) pipeHandler
                else document = `${beforeRegion}${pipeHandler}${afterRegion}`
            } else {
                // Execute any statements in the document.
                const cmd = args.shift()!.toLowerCase()
                const a = this._parseArgs(args)
                if (inDollarContext) this.variables[inDollarContext] = this._execStatement(cmd, match, "", a)
                else document = this._execStatement(cmd, match, document, a)
            }
        }

        // Returns the document.
        return document
    }

    // Evals a document. The result can then be parsed into the Kubernetes parser.
    public eval(document: string): string {
        // Reset the variables.
        this.variables = {}

        // Runs the internal eval function.
        return this._eval(document)
    }
}
