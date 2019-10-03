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

// Imports printj.
import * as printj from "printj"

// Imports the GitHub filesystem.
import GitHubFS from "./githubFs"

// A YAML parser.
import { safeLoad } from "js-yaml"

// Defines the filesystem for the Helm Charts official repository.
const fs = new GitHubFS("helm/charts")

// Cache stable and incubator for any future reference.
export const helmCache = {
    stable: fs.ls("stable"),
    incubator: fs.ls("incubator"),
} as Record<string, Promise<{
    file: boolean;
    path: string;
    name: string;
}[]> | undefined>

// A statement in Helm.
const helmStatement = /{{[ -]*([^}]+)[ -]*}}/

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

    public call(): boolean {
        return eval(`this.a ${this.operator} this.b`) as boolean
    }
}

// A small class to define a quote.
class Quote {
    public text: string
    public constructor(text: string) {
        this.text = text
    }
}

// The Helm document parser.
class HelmDocumentParser {
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

    // Joins quotes and strings.
    private _joinQuoteString(data: (string | Quote)[], join: string) {
        const args: string[] = []
        for (const d of data) {
            if (typeof d === "string") args.push(d)
            else args.push(d.text)
        }
        return args.join(join)
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
    private _checkCondition(condition: string | undefined): boolean {
        // Return true if undefined.
        if (!condition) return true

        // Trim the condition initially.
        condition = condition.trim().replace(/  +/g, " ")

        // Split this condition.
        const args = condition.split(/"[^"]+"| /)
        const conditionSplit: string[] = []
        for (const a of args) {
            if (a !== "") conditionSplit.push(a)
        }

        // Check the operator if it exists.
        let operator = conditionSplit.shift()!

        // Not is a special edgecase! It goes up here due to that.
        let not = false

        // Does one string contain another?
        let contain = true

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
                return `${beforeRegion}${this._handleIfBlock(this._joinQuoteString(args, " "), cropped, match.input!.length, length)}${afterRegion}`
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
                console.log(args)
            }
            case "printf": {
                // Handles printf.
                let formatter = args.shift()!
                console.log(formatter)
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
            if (last) bundle.push(last)
            last = this._execStatement(cmd, match, "", bundle)
        }
    }

    // Evals a document. The result can then be parsed into the Kubernetes parser.
    public eval(document: string): string {
        // Reset the variables.
        this.variables = {}

        // Look for any statements in the document.
        for (;;) {
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
                const bundles: string[][] = []
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
                    const startIndex = match.index!
                    const { beforeRegion, afterRegion } = this._crop(document, startIndex, startIndex + match[0].length)
                    const pipeHandler = this._handlePipe(bundles, match)
                    if (inDollarContext) this.variables[inDollarContext] = pipeHandler
                    else document = `${beforeRegion}${pipeHandler}${afterRegion}`
                }
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
}

// Defines the Helm chart maintainer.
export class HelmChartMaintainer {
    public name: string
    public email: string

    public constructor(name: string, email: string) {
        this.email = email
        this.name = name
    }
}

// Defines the Helm result.
export class HelmResult {
    public name: string
    public description: string
    public version: string
    public home: string
    public maintainer: HelmChartMaintainer[]
    public icon: string | undefined

    public constructor(name: string, description: string, version: string, home: string, maintainer: HelmChartMaintainer[], icon: string | undefined) {
        this.description = description
        this.name = name
        this.version = version
        this.home = home
        this.maintainer = maintainer
        this.icon = icon
    }
}

// Defines the Helm core parser.
export default class HelmCoreParser {
    public context: HelmDocumentParser
    public chart: string
    public promise: Promise<HelmResult | null>

    // Constructs the class.
    public constructor(context: Record<string, any>, chart: string) {
        this.context = new HelmDocumentParser(context)
        this.chart = chart
        this.promise = this._exec()
    }

    // Capitalized all the keys.
    private _capAll(records: Record<string, any>): Record<string, any> {
        const x: Record<string, any> = {}
        for (const r in records) {
            const split = r.split("")
            x[`${split.shift()!.toUpperCase()}${split.join("").toLowerCase()}`] = records[r]
        }
        return x
    }

    // Handles the Helm folder.
    private async _handleFolder(path: string): Promise<HelmResult | null> {
        // Defines the unparsed Chard.json (if it exists).
        const unparsedChartInformation = await fs.get(`${path}/Chart.yaml`)
        if (!unparsedChartInformation) throw new Error("No Chart.yaml found!")

        // Defines the parsed chart file and load in the chart.
        const chartYaml = safeLoad(unparsedChartInformation) as Record<string, any>
        this.context.context.Chart = this._capAll(chartYaml)

        // Defines the maintainers.
        const maintainers: HelmChartMaintainer[] = []
        for (const m of chartYaml.maintainers) maintainers.push(new HelmChartMaintainer(m.name, m.email))

        // Defines the unparsed values.yaml (if it exists).
        const unparsedValuesYaml = await fs.get(`${path}/values.yaml`)
        if (!unparsedValuesYaml) throw new Error("No values.yaml found!")

        // TODO: Use the values.yaml to hint at stuff.
        // Loads the values.yaml.
        const valuesYaml = safeLoad(unparsedValuesYaml) as Record<string, any>

        // TODO: Parse notes!
        // Defines the notes.
        const notes = await fs.get(`${path}/templates/values.yaml`)

        // Initialises the context.
        const init = await fs.get(`${path}/templates/_helpers.tpl`)
        if (init) this.context.eval(init)
        // TODO: Kubernetes stuff.
        // KubernetesDescription[]
        const kubernetesParts: string[] = []
        for (const file of await fs.ls(`${path}/templates`)) {
            // await kubernetesParse(...)
            console.log(this.context.eval((await fs.get(file.path))!))
        }

        // TODO: Finish this class.
        return null
    }

    // Starts execution.
    private async _exec(): Promise<HelmResult | null> {
        const slashSplit = this.chart.toLowerCase().split("/")
        if (slashSplit.length === 1) return null
        const repo = helmCache[slashSplit[0]]
        if (!repo) return null
        for (const item of await repo) {
            if (item.name === slashSplit[1] && !item.file) {
                // This is the folder we want! Get results from it.
                return this._handleFolder(item.path)
            }
        }
        return null
    }
}

// @ts-ignore
window.HelmCoreParser = HelmCoreParser
