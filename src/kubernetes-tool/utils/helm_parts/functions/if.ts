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

import DocumentParser from "../document_parser"
import { Quote, OperatorManager } from "../utils"
import { Token } from "../tokeniser"

// Processes a condition. Is it true?
const processCondition = (parser: DocumentParser, args: (string | Quote)[]): boolean => {
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
            return false
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
                return Boolean(parser.helmdef2object(operator))
            } else {
                // Returns false if it doesn't understand.
                return false
            }
        }
    }

    // Each part in a easy to iterate array. Makes the next part a lot easier.
    const dataParts: any[] = []

    // Processes each argument.
    for (const p of args) dataParts.push(parser.processArg(p))

    // Handles include.
    if (include) return dataParts[0]

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

// Handles the if statement.
export default (parser: DocumentParser, args: (string | Quote)[], token: Token): string => {
    // Gets all the elses and the inner of the if statement.
    const ifInner = token.inner
    const elses = token.else || []

    // Checks the if statement.
    if (processCondition(parser, args)) return parser.handleTokens(ifInner!)

    // Handle elses.
    for (const else_ of elses) {
        // Recreate the condition into elseQuoteSplit.
        const elseSplit = else_.data.trim().split(" ")
        elseSplit.shift()
        const elseQuoteSplit: (string | Quote)[] = []
        let quoteBuffer: string[] = []
        for (const split of elseSplit) {
            if (split.startsWith("\"")) {
                if (quoteBuffer.length !== 0) quoteBuffer.push(split.substr(1))
            } else if (split.endsWith("\"")) {
                if (quoteBuffer.length === 0) {
                    elseQuoteSplit.push(split)
                } else {
                    quoteBuffer.push(split.substr(0, split.length - 1))
                    elseQuoteSplit.push(new Quote(quoteBuffer.join(" ")))
                    quoteBuffer = []
                }
            } else {
                if (quoteBuffer.length === 0) elseQuoteSplit.push(split)
                else quoteBuffer.push(split)
            }
        }

        // Process the argument to see if it is true; if it is, parse this.
        elseQuoteSplit.shift()
        if (processCondition(parser, elseQuoteSplit)) return parser.handleTokens(else_.inner!)
    }

    // Returns a blank string.
    return ""
}
