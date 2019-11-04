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
    }
}

// Exports a object.
export default new Categorisation()
