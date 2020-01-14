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

import { textDescriptions, learnMore } from "../descriptions"

// Defines the item.
class Item {
    public kind: string
    public fp: string
    public file: Record<string, any>

    public constructor(kind: string, fp: string, file: Record<string, any>) {
        this.kind = kind
        this.fp = fp
        this.file = file
    }
}

// Defines a category.
export class Category {
    public name: string
    public learnMore: string | undefined
    public description: string | undefined

    public constructor(name: string) {
        this.name = name
        this.description = textDescriptions[name]
        this.learnMore = learnMore[name]
    }
}

// Defines the categorisation.
class Categorisation {
    // Defines the categories.
    private items: Item[]

    // Constructs the class.
    public constructor() {
        this.items = []
    }

    // Clears all the categories.
    public clear() {
        this.items = []
    }

    // Categorises the item.
    public insert(kind: string, fp: string, file: Record<string, any>) {
        this.items.push(new Item(kind, fp, file))
    }

    // Gets all the things.
    public getAll() {
        const kind2cat: Record<string, Category> = {}
        const cat2arr: Map<Category, Item[]> = new Map()

        for (const i of this.items) {
            if (!kind2cat[i.kind]) {
                kind2cat[i.kind] = new Category(i.kind)
                cat2arr.set(kind2cat[i.kind], [])
            }
            cat2arr.get(kind2cat[i.kind])!.push(i)
        }

        return cat2arr
    }

    // Gets the cost.
    public getCost() {
        let cost = 0
        const all = this.getAll()
        for (const category of all.keys()) {
            if (category.name === "Service") {
                // Check for load balancers.
                for (const i of all.get(category)!) {
                    if (i.file.spec.type === "LoadBalancer") cost += 15
                }
            } else if (category.name === "PersistentVolumeClaim") {
                // This will handle block storage.
                for (const i of all.get(category)!) {
                    if (i.file.spec.storageClassName === "do-block-storage") {
                        let calculatedStorage = 0
                        if (((i.file.spec.resources || {}).requests || {}).storage) {
                            const data = i.file.spec.resources.requests.storage
                            if (typeof data === "string") {
                                // Handles the storage.
                                const endings = {
                                    "Gi": 1,
                                    "Mi": 0.1,
                                    "Ti": 10,
                                } as Record<string, number>
                                for (const e in endings) {
                                    let d
                                    if (data.endsWith(e)) d = Number(data.substr(0, data.length - e.length))
                                    if (d) calculatedStorage = d * endings[e]
                                }
                            }
                        }
                        cost += calculatedStorage * 0.1
                    }
                }
            }
        }
        return cost
    }
}

// Exports a object.
export default new Categorisation()
