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

// Imports needed stuff.
import HelmDocumentParser from "./document_parser"
import { fs } from "./utils"
import { safeLoad } from "js-yaml"
import helmCache from "./helm_cache"
import asyncLock from "async-lock"
const lock = new asyncLock()

// Defines the Helm core parser.
export default class HelmCoreParser {
    public context: HelmDocumentParser
    public chart: string
    public promise: Promise<Record<string, string> | null>

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
    private async _handleFolder(path: string): Promise<Record<string, string> | null> {
        // Defines the unparsed Chard.json (if it exists).
        const unparsedChartInformation = await fs.get(`${path}/Chart.yaml`)
        if (!unparsedChartInformation) throw new Error("No Chart.yaml found!")

        // Defines the parsed chart file and load in the chart.
        const chartYaml = safeLoad(unparsedChartInformation) as Record<string, any>
        this.context.context.Chart = this._capAll(chartYaml)

        // Defines the unparsed values.yaml (if it exists).
        const unparsedValuesYaml = await fs.get(`${path}/values.yaml`)
        if (!unparsedValuesYaml) throw new Error("No values.yaml found!")

        // Loads the values.yaml.
        const valuesYaml = safeLoad(unparsedValuesYaml) as Record<string, any>
        this.context.context.Values = valuesYaml

        // Sets the release context.
        this.context.context.Release = {
            Name: "<release name>",
            Namespace: "<release namespace>",
            Service: "Tiller", // This is always Tiller, idk why it's a thing, seems useless to me.
            IsUpgrade: false, // This emulates a clean install.
            IsInstall: true,
            Revision: 1, // No upgrades, clean install!
            Time: Math.floor(Date.now() / 1000),
        }

        // Initialises the context.
        const init = await fs.get(`${path}/templates/_helpers.tpl`)
        if (init) this.context.eval(init)

        // Handles each part.
        const promises: Promise<void>[] = []
        const kubernetesParts: Record<string, string> = {}
        for (const file of await fs.ls(`${path}/templates`)) {
            if (!file.file) continue
            promises.push(fs.get(file.path).then(async d => {
                await lock.acquire("ctx-lock", () => void(0))
                const ctx = this.context.eval(d!)
                if (file.name !== "_helpers.tpl" && ctx !== "") kubernetesParts[file.path] = ctx
            }))
        }
        await Promise.all(promises)

        return kubernetesParts
    }

    // Starts execution.
    private async _exec(): Promise<Record<string, string> | null> {
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
