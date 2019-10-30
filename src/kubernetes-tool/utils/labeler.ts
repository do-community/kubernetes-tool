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

// Defines a circular type.
interface LabelValue {
    // Base is the base name,
    base?: string;

    // Children is the children arguments.
    children?: LabelValueObject;
}
interface LabelValueObject extends Record<string, LabelValue> {}

// Handles labeling.
export default class Labeler {
    // Defines the labels.
    public labels: LabelValue

    // Initialises the labeler.
    public constructor(base?: LabelValue) {
        this.labels = base || {}
        if (!this.labels.children) this.labels.children = {}
    }

    // Imports any children.
    public importChildren(children: LabelValueObject, path?: string[]) {
        // If path does not exist, make the path array.
        if (!path) path = []

        // Gets the relevant parent object.
        let parentObject = this.labels

        // Iterate through the path.
        for (const p of path) {
            // Ensure "children" exists on the parent object.
            if (!parentObject.children) parentObject.children = {}

            // Gets the item from the child.
            let child = parentObject.children[p]

            // If the item doesn't exist, create it.
            if (!child) {
                child = {}
                parentObject.children[p] = child
            }

            // Set the parent object to this.
            parentObject = child
        }

        // Ensure "children" exists on the final object.
        if (!parentObject.children) parentObject.children = {}

        // Handles all children.
        for (const key in children) {
            // Gets the child.
            const child = children[key]

            // Get the relevant object from the parent. If it doesn't exist, make it.
            let relevant = parentObject.children[key]
            if (!relevant) {
                // The child does not exist. It needs to be made.
                relevant = {}
                parentObject.children[key] = relevant
            }

            // If the child has a base, we need to put that in the relevant key.
            if (child.base) relevant.base = child.base

            // Check if this child has any children.
            if (child.children) {
                // Makes sure the children key exists.
                if (!relevant.children) relevant.children = {}

                // Gets the true path.
                const truePath = path.slice()
                truePath.push(key)

                // Handles the children.
                this.importChildren(child.children, truePath)
            }
        }
    }

    // Gets the relevant label.
    public getLabel(path: string[]): string | undefined {
        // Gets the last label.
        let lastLabel: string | undefined

        // Gets the last object.
        let lastObject: LabelValueObject | undefined = this.labels.children

        // Handles each part of the path.
        for (const p of path) {
            // Gets the key from the last object.
            const newItem: LabelValue | undefined = lastObject![p]

            // If last object is no more, return here.
            if (!newItem) return lastLabel

            // Sets last object.
            lastObject = newItem.children

            // Set the last label to this base.
            lastLabel = newItem.base
        }

        // Returns the last label.
        return lastLabel
    }
}
