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

// The Helm document parser.
export default class HelmDocumentParser {
    // Defines the context.
    public context: Record<string, any>
    private templateContext: Record<string, any>
    public variables: Record<string, any>

    // Constructs the class.
    public constructor(context: Record<string, any>) {
        this.context = context
        this.templateContext = {}
        this.variables = {}
    }

    // Finds the end statement.
    private _findEnd(document: string, statement: string): {
        length: number;
        endIndex: number;
    } {
        const m = document.match(/{{[ -]*end[ -]*}}/)
        if (!m) throw new Error(`${statement} - No "end" found to this statement!`)
        return {
            length: m[0].length,
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
            cropped: data.substr(start, end),
            afterRegion: data.substr(end, data.length),
            beforeRegion: data.substr(0, start),
        }
    }

    // Maps the Helm definition to a JS object.
    private _helmdef2object(definition: string): any {
        // Make it an array and remove the first thing which will be whitespace.
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
        for (const arg of conditionSplit) {
            if (typeof arg === "string") {
                if (arg.startsWith("(")) {
                    // Inline function! Get the bits inbetween.
                    const m = String(arg).match(/^(.+)$/)
                    if (!m) throw new Error(`"${arg}" - Invalid argument!`)
                    const middle = m[1]
                    dataParts.push(this._checkCondition(this._parseArgs(middle.split(" "))))
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
            throw new Error(`"${arg}" - Invalid argument!`)
        }

        // Handles semver.
        if (semverFlag) return semver.eq(dataParts[0], dataParts[1])

        // If this is a not statement, we only need to worry about the first arg.
        if (not) return !Boolean(dataParts[0])

        // Check if one contains the other.
        if (contain) return String(dataParts[0]).includes(dataParts[1])

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
        block = block.substr(0, block.length - endLength).substr(rangeLength, block.length).trim()

        // Defines all the variables.
        const variables = []
        for (;;) {
            if (typeof condition[0] === "string") {
                let c = condition[0] as string
                if (c.endsWith(",")) {
                    c = c.substr(0, condition.length - 1)
                }
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

        // Iterates the object.
        const parts = []
        const obj = this._helmdef2object(condition[0] as string) || {}
        for (const k in obj) {
            const i = obj[k]
            if (variables.length === 1) {
                this.variables[variables[0]] = i
            } else {
                this.variables[variables[0]] = k
                this.variables[variables[1]] = i
            }
            parts.push(this._eval(block))
        }

        // Returns all the parts joined.
        return parts.join("")
    }

    // Handles if statements.
    private _handleIfBlock(condition: (string | Quote)[], block: string, ifLength: number, endLength: number): string {
        // Remove the if/end statement from the block.
        block = block.substr(0, block.length - endLength).substr(ifLength, block.length).trim()

        // This array will be full of else statements.
        // condition [string | undefined] - The condition to trigger the else statement. Can be none.
        // block [string] - The block to be returned.
        const elses: {
            condition: (string | Quote)[] | undefined;
            block: string;
        }[] = []

        // Splits the block by any inline if statements.
        const blockSplit = block.split(/{{[ -]*if([^}]+)[ -]*}}.+{{[ -]*end[ -]*}}/)
        let recreatedBlock = ""
        for (let part of blockSplit) {
            if (part.substr(2).trim().startsWith("if")) {
                // This is a if statement. Add this into the block.
                recreatedBlock += part
            } else {
                for (;;) {
                    // This is NOT a if statement. Deal with any else's in it.
                    const r = /{{[ -]*else([^}]*)[ -]*}}/
                    let elseRegexpMatch = part.match(r)
                    if (!elseRegexpMatch) {
                        recreatedBlock += elseRegexpMatch
                        break
                    }

                    // Remove the match from the part.
                    part = part.substr(0, elseRegexpMatch.index! + elseRegexpMatch[0].length)

                    // Search for the next else if it exists.
                    // If it does not exist, we can just go to the end of the document.
                    const elseStart = elseRegexpMatch.index!
                    const elseLength = elseRegexpMatch[0].length
                    const condition = this._parseArgs(elseRegexpMatch[1].split(" "))
                    elseRegexpMatch = part.match(r)
                    if (elseRegexpMatch) {
                        elses.push({
                            block: part.substr(elseStart + elseLength, part.length - elseRegexpMatch.index!),
                            condition: condition,
                        })
                    } else {
                        elses.push({
                            block: part.substr(elseStart + elseLength, part.length),
                            condition: condition,
                        })
                    }
                }
            }
        }

        // Lets check the condition; if it fails, we will iterate elses.
        if (this._checkCondition(condition)) {
            return recreatedBlock
        } else {
            for (const else_ of elses) {
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
            // TODO: Some more operators are needed here.
            case "if": {
                // Defines the if statement.
                const startIndex = match.index!
                const { length, endIndex } = this._findEnd(document, match[0])
                const { cropped, beforeRegion, afterRegion } = this._crop(document, startIndex, endIndex)
                return `${beforeRegion}${this._handleIfBlock(args, cropped, match.input!.length, length)}${afterRegion}`
            }
            case "range": {
                // Defines the range statement.
                const startIndex = match.index!
                const { length, endIndex } = this._findEnd(document, match[0])
                const { cropped, beforeRegion, afterRegion } = this._crop(document, startIndex, endIndex)
                return `${beforeRegion}${this._handleRangeBlock(args, cropped, match.input!.length, length)}${afterRegion}`
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
                const { length, endIndex } = this._findEnd(document, match[0])
                const { cropped, beforeRegion, afterRegion } = this._crop(document, startIndex, endIndex)
                let result = cropped.substr(0, cropped.length - length)
                const argStart = result.split("}}")
                argStart.pop()
                argStart.shift()
                result = `${argStart.join("}}")}}}`
                this.templateContext[String(args[0])] = result
                return `${beforeRegion}${afterRegion}`
            }
            case "template": {
                // Defines an existing template.
                const startIndex = match.index!
                const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                return `${beforeRegion}${this.templateContext[String(args[0])]}${afterRegion}`
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
                    if (typeof formatter === "string") {
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
            default: {
                // Not a statement, is it a definition?
                const join = match[1].trim()
                if (join.startsWith("/*")) {
                    // This is a comment. Remove/break here.
                    const startIndex = match.index!
                    const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                    return `${beforeRegion}${afterRegion}`
                }
                if (!join.startsWith(".")) throw new Error(`${match[0]} - Invalid definition!`)
                const startIndex = match.index!
                const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                return `${beforeRegion}${this._helmdef2object(join)}${afterRegion}`
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
    }

    // Used for recalling the eval stuff locally without reinitialising all the things.
    private _eval(document: string): string {
        // Look for any statements in the document.
        for (;;) {
            if (!document) document = ""
            const match = document.match(helmStatement)
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
                    document = `${beforeRegion}${this.context[args[0]]}${afterRegion}`
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
                    if (a !== " ") {
                        if (a === "|") {
                            bundles.push(buffer)
                            buffer = []
                        } else {
                            buffer.push(a)
                        }
                    }
                }
                for (const bundleIndex in bundles) bundles[bundleIndex] = this._parseArgs(bundles[bundleIndex] as string[])
                const startIndex = match.index!
                const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                const pipeHandler = this._handlePipe(bundles, match)
                if (inDollarContext) this.variables[inDollarContext] = pipeHandler
                else document = `${beforeRegion}${pipeHandler}${afterRegion}`
            } else {
                // Execute any statements in the document.
                const cmd = args.shift()!.toLowerCase()
                const a = this._parseArgs(args)
                if (inDollarContext) this._execStatement(cmd, match, "", a)
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

        return this._eval(document)
    }
}
