/*
Copyright 2021 DigitalOcean

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
import { dump } from "js-yaml"

export default (parser: DocumentParser, args: (string | Quote)[]): string => {
    const a = parser.processArg(args[0])
    if (a === "") return ""
    if (typeof a === "string") return dump(a)
    if (typeof a === "boolean") return String(a)
    if (!a) return "null"
    let d = ""
    if (Array.isArray(a)) {
        for (const x of a) {
            d += `- ${dump(x)}\n`
        }
        return d
    }
    for (const x in a) {
        let yamlDump = dump(a[x]).trim()
        if (a[x] instanceof Object) yamlDump = `\n${yamlDump.match(/ +/) ? yamlDump.match(/ +/)![0] : ""}${yamlDump}`
        d += `${dump(x).trim()}: ${yamlDump}\n`
    }
    return d
}
