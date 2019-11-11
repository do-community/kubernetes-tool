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

// Defines a very basic filesystem using GitHub.
export default class GitHubFS {
    public repo: string

    // Constructs the class.
    public constructor(repo: string) {
        this.repo = repo
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
        const res = await fetch(`https://api.github.com/repos/${this.repo}/contents/${folder}`)
        const json = await res.json()
        for (const item of json) {
            items.push({
                file: item.type !== "dir",
                name: item.name,
                path: item.path,
            })
        }
        return items
    }

    // Gets the item specified. Returns null if it is not found.
    public async get(fp: string): Promise<string | undefined> {
        const res = await fetch(`https://raw.githubusercontent.com/${this.repo}/master/${fp}`)
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
