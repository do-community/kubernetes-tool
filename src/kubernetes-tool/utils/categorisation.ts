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

// Defines the item.
class Item {
    public kind: string
    public fp: string

    public constructor(kind: string, fp: string) {
        this.kind = kind
        this.fp = fp
    }
}

// TODO: Make this neater, in another file.
const descriptions = {
    Service: "description here",
} as Record<string, string>

// Defines a category.
export class Category {
    public name: string
    public description: string

    public constructor(name: string) {
        this.name = name
        this.description = descriptions[name]
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
    public insert(kind: string, fp: string) {
        this.items.push(new Item(kind, fp))
    }

    // Gets all the things.
    public getAll() {
        const kind2cat: Record<string, Category> = {}
        const cat2arr: Map<Category, string[]> = new Map()

        for (const i of this.items) {
            if (!kind2cat[i.kind]) {
                kind2cat[i.kind] = new Category(i.kind)
                cat2arr.set(kind2cat[i.kind], [])
            }
            cat2arr.get(kind2cat[i.kind])!.push(i.fp)
        }

        return cat2arr
    }
}

// Exports a object.
export default new Categorisation()
