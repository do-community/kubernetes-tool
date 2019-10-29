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
