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

// The Helm deployment parser.
class HelmParserContext {
    // Defines the context.
    private context: Record<string, any>

    // Constructs the class.
    public constructor(context: Record<string, any>) {
        this.context = context
    }

    // Handles if statements.
    private _handleIf(condition: string, block: string): string {
        return ""
    }

    // Finds the end statement.
    private _findEnd(document: string, statement: string): {
        length: number,
        endIndex: number,
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
        cropped: string,
        beforeRegion: string,
        afterRegion: string
    } {
        return {
            cropped: data.substr(start, end),
            afterRegion: data.substr(end, data.length),
            beforeRegion: data.substr(0, start),
        }
    }

    // Evals a document. The result can then be parsed into the Kubernetes parser.
    public eval(document: string): string {
        // Look for any statements in the document.
        for (;;) {
            const match = document.match(helmStatement)
            if (!match) break
            const statementSplit = match[1].trim().split(" ")
            const statement = statementSplit.shift()!.toLowerCase()
            switch (statement) {
                case "if": {
                    const startIndex = match.index!
                    const { length, endIndex } = this._findEnd(document, match[0])
                    const { cropped, beforeRegion, afterRegion } = this._crop(document, startIndex, endIndex)
                }
                default: {
                    // Not a statement, is it a definition?
                    
                }
            }
        }

        // Returns a empty string.
        return ""
    }
}
