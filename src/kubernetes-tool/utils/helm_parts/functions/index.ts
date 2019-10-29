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

import { Token } from "../tokeniser"
import DocumentParser from "../document_parser"
import { Quote } from "../utils"

import env from "./env"
import uuidv4 from "./uuidv4"
import trimSuffix from "./trimSuffix"
import if_ from "./if"
import range from "./range"
import default_ from "./default"
import quote from "./quote"
import define from "./define"
import template from "./template"
import trunc from "./trunc"
import indent from "./indent"
import toYaml from "./toYaml"
import printf from "./printf"
import include from "./include"
import replace from "./replace"
import b64enc from "./b64enc"

export default {
    env, uuidv4, trimSuffix, if: if_, range, default: default_, quote, define,
    template, trunc, indent, toYaml, printf, include, replace, b64enc,
} as Record<string, (parser: DocumentParser, args: (string | Quote)[], token: Token) => string>
