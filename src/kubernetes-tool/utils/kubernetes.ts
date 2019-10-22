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
import k8sData from "./k8s_data"
import { safeLoad } from "js-yaml"

// Defines the data structure.
class KVRecursiveRecord {
    public key: string
    public value: string
    public recursive?: KVRecursiveRecord[]

    public constructor(key: string, value: string) {
        this.key = key
        this.value = value
    }
}

// Parses based on the spec specified.
const parseSpec = (layer: string, obj: Record<string, any>, label?: boolean): KVRecursiveRecord[] => {
    // Defines all the KV things.
    const kv: KVRecursiveRecord[] = []

    // Loads the spec up.
    const loadedSpec = k8sData[layer] || {}

    // Iterates the object.
    for (const key in obj) {
        const kvObj = new KVRecursiveRecord(key, loadedSpec[key] || "Unable to recognise this key in this tool.")
        let newLayer = layer
        if (obj[key] && obj[key].constructor === Object) {
            if (layer === "base") {
                if (key === "metadata") newLayer = "metadata"
                else newLayer = obj.kind
            }
            if (key === "labels") label = true
            kvObj.recursive = parseSpec(newLayer, obj[key], label)
        }
        if (label && key !== "labels") kvObj.value = "This attaches this label to the deployment."
        kv.push(kvObj)
    }

    // Returns KV.
    return kv
}

// Parses the Kubernetes data.
export default (data: string | undefined): KVRecursiveRecord[] | undefined => {
    // Return here.
    if (!data) return

    // Defines the parsed data.
    let parsedData: Record<string, any>
    try {
        parsedData = safeLoad(data)
        if (!parsedData || parsedData.constructor !== Object) throw new Error()
    } catch (_) {
        // Returns nothing.
        return
    }

    // Parse all the things.
    const kv = parseSpec("base", parsedData)

    // Returns all the KV bits.
    if (kv.length === 0) return
    return kv
}
