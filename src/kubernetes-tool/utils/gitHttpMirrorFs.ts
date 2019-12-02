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

// Defines a very basic filesystem using git-http-mirror.
export default class GitHTTPMirrorFS {
    public alias: string
    public hostname: string
    private itemCache: Record<string, Response>

    // Constructs the class.
    public constructor(alias: string, hostname: string) {
        this.alias = alias
        this.hostname = hostname
        this.itemCache = {}
    }

    // Lists the folder specified.
    public async ls(folder: string): Promise<{
        file: boolean;
        path: string;
        name: string;
    }[]> {
        const items: {
            file: boolean;
            path: string;
            name: string;
        }[] = []
        const res = await fetch(`${this.hostname}/${this.alias}/${folder}`, {headers: {
            Accept: "application/json",
        }})
        if (res.headers.get("is-dir-listing") === "false") {
            return []
        }
        const json = await res.json()
        for (const item of json) {
            const path = `${this.hostname}/${this.alias}/${folder}/${item}`
            let itemResult = this.itemCache[path]
            if (!this.itemCache[path]) {
                itemResult = await fetch(path)
                this.itemCache[path] = itemResult
            }
            items.push({
                file: itemResult.headers.get("is-dir-listing") !== "true",
                name: item,
                path: `${folder}/${item}`,
            })
        }
        return items
    }

    // Gets the item specified. Returns null if it is not found.
    public async get(fp: string): Promise<string | undefined> {
        const res = await fetch(`${this.hostname}/${this.alias}/${fp}`)
        if (!res.ok) return undefined
        return await res.text()
    }

    // Queries the start of the name.
    public async queryStart(fp: string, start: string): Promise<string | undefined> {
        const ls = await this.ls(fp)
        for (const f of ls) {
            if (f.name.startsWith(start)) return f.path
        }
    }

    // Queries all with a certian start of their name.
    public async queryStartAll(fp: string, start: string, limit: number): Promise<string[]> {
        const items = []
        const ls = await this.ls(fp)
        for (const f of ls) {
            if (f.name.startsWith(start)) {
                items.push(f.path)
                if (items.length === limit && limit !== 0) return items
            }
        }
        return items
    }
}
