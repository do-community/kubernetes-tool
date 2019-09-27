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

// A statement in Helm.
const helmStatement = /{{([^}]+)}}/

// The operator manager. Allows for operations to safely be evaled between 2 objects.
class OperatorManager {
    public a: any
    public b: any
    public operator: string

    public constructor(a: any, b: any, operator: string) {
        this.a = a
        this.b = b
        this.operator = operator
    }

    call(): boolean {
        return eval(`this.a ${this.operator} this.b`) as boolean
    }
}

// The Helm deployment parser.
class HelmParserContext {
    // Defines the context.
    private context: Record<string, any>

    // Constructs the class.
    public constructor(context: Record<string, any>) {
        this.context = context
    }

    // Finds the end statement.
    private _findEnd(document: string, statement: string): {
        length: number;
        endIndex: number;
    } {
        const m = document.match(/{{ *end *}}/)
        if (!m) throw new Error(`${statement} - No "end" found to this statement!`)
        return {
            length: m.input!.length,
            endIndex: m.index! + m.input!.length,
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
            currentCtx = this.context[part]
            if (currentCtx === undefined) return undefined
        }

        // Returns the current context.
        return currentCtx
    }

    // Checks the condition given by doing some basic parsing.
    private _checkCondition(condition: string | undefined): boolean {
        // Return true if undefined.
        if (!condition) return true

        // Trim the condition initially.
        condition = condition.trim().replace(/  +/g, " ")

        // Split this condition.
        const conditionSplit = condition.split(" ")

        // Check the operator if it exists.
        let operator = conditionSplit.shift()!

        // Not is a special edgecase! It goes up here due to that.
        let not = false

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
            default: {
                if (operator.startsWith(".")) {
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
            if (arg.startsWith("(")) {
                // Inline function! Get the bits inbetween.
                const m = arg.match(/^(.+)$/)
                if (!m) throw new Error(`"${arg}" - Invalid argument!`)
                const middle = m[1]
                dataParts.push(this._checkCondition(middle))
                continue
            }

            if (arg.startsWith(".")) {
                // Get the attribute.
                dataParts.push(this._helmdef2object(arg))
                continue
            }

            // Whayyyyyyyyyyyt.
            throw new Error(`"${arg}" - Invalid argument!`)
        }

        // If this is a not statement, we only need to worry about the first arg.
        if (not) return !Boolean(dataParts[0])

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

    // Handles if statements.
    private _handleIfBlock(condition: string, block: string, ifLength: number, endLength: number): string {
        // Remove the if/end statement from the block.
        block = block.substr(0, block.length - endLength).substr(ifLength, block.length).trim()

        // This array will be full of else statements.
        // condition [string | undefined] - The condition to trigger the else statement. Can be none.
        // block [string] - The block to be returned.
        const elses: {
            condition: string | undefined;
            block: string;
        }[] = []

        // Splits the block by any inline if statements.
        const blockSplit = block.split(/{{ *if([^}]+)}}.+}{{ *end *}}/)
        let recreatedBlock = ""
        for (let part of blockSplit) {
            if (part.substr(2).trim().startsWith("if")) {
                // This is a if statement. Add this into the block.
                recreatedBlock += part
            } else {
                for (;;) {
                    // This is NOT a if statement. Deal with any else's in it.
                    const r = /{{ *else([^}]*)}}/
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
                    const condition = elseRegexpMatch[1]
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

    // Evals a document. The result can then be parsed into the Kubernetes parser.
    public eval(document: string): string {
        // Look for any statements in the document.
        for (;;) {
            const match = document.match(helmStatement)
            if (!match) break
            const args = match[1].trim().split(" ")
            const statement = args.shift()!.toLowerCase()
            switch (statement) {
                case "if": {
                    // Defines the if statement.
                    const startIndex = match.index!
                    const { length, endIndex } = this._findEnd(document, match[0])
                    const { cropped, beforeRegion, afterRegion } = this._crop(document, startIndex, endIndex)
                    document = `${beforeRegion}${this._handleIfBlock(args.join(" "), cropped, match.input!.length, length)}${afterRegion}`
                    break
                }
                case "else": {
                    // This needs to be in a if statement.
                    throw new Error(`${match[0]} - This should be in a if statement!`)
                }
                case "end": {
                    // End needs to follow a valid operator!
                    throw new Error(`${match[0]} - End needs to follow a valid operator!`)
                }
                default: {
                    // Not a statement, is it a definition?
                    
                }
            }
        }

        // Returns the document.
        return document
    }
}
