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
export class HelmCoreParser {
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
        this.context.context.Values = valuesYaml

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
