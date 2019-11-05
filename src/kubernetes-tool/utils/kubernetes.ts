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

// Imports the needed stuff.
import k8sData from "../descriptions"
import Labeler from "./labeler"

// Defines the data structure.
class KVRecursiveRecord {
    public key: string
    public value: string | undefined
    public recursive?: KVRecursiveRecord[]

    public constructor(key: string, value: string | undefined) {
        this.key = key
        this.value = value
    }
}

// Parses the Kubernetes data.
const p = (parsedData: Record<string, any>, keys?: string[], kind?: string): KVRecursiveRecord[] | undefined => {
    // If not keys, make the keys array.
    if (!keys) keys = []

    // Defines the result.
    const result: KVRecursiveRecord[] = []

    // Creates a labeler with the base.
    const l = new Labeler(k8sData.base)

    // Imports the children.
    l.importChildren({
        children: {
            spec: {
                children: (k8sData as any)[kind || parsedData.kind] || {},
            },
        },
    })

    // Handles the label.
    for (const k in parsedData) {
        // The array of the JSON path (we clone it because it is shared).
        const keyPlus = keys.slice()

        // Push the current key to the JSON path.
        keyPlus.push(k)

        if (!parsedData[k] || parsedData[k].constructor !== Object) {
            // This is not a object, handle this here.
            result.push(new KVRecursiveRecord(k, l.getLabel(keyPlus)))
        } else {
            // This is a object, lets be recursive.
            const kv = new KVRecursiveRecord(k, l.getLabel(keyPlus))
            kv.recursive = p(parsedData[k], keyPlus, kind || parsedData.kind)
            result.push(kv)
        }
    }

    // Returns all the KV bits.
    if (result.length === 0) return
    return result
}

export default p
