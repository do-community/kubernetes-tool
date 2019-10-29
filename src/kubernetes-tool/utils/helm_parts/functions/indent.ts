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

export default (parser: DocumentParser, args: (string | Quote)[]): string => {
    const toRepeat = " ".repeat(Number(parser.processArg(args[0])))
    const dataSplit = parser.processArg(args[1]).split("\n")
    for (const part in dataSplit) {
        dataSplit[part] = `${toRepeat}${dataSplit[part]}`
    }
    return `\n${dataSplit.join("\n")}`
}
