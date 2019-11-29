import { fs } from "../utils/helm_parts/utils"
// @ts-ignore
import { HelmCoreParser } from "./helm"

// Runs the compatibility test.
async function test() {
    let errors = ""
    let passed = ""
    let total = 0
    let works = 0
    const promises = []
    for (const item of await fs.ls("stable")) {
        if (!item.file) {
            total++
            promises.push(new HelmCoreParser({}, item.path).promise.then(() => {
                passed += item.path + "\n"
                works++
            }).catch(err => {
                errors += `${item.path}: ${err}\n`
            }))
        }
    }
    await Promise.all(promises)
    console.log(`${works}/${total}\n---\nFailed\n---\n${errors === "" ?  "No errors found!\n" : errors}\nPassed\n---\n${passed}`)
}

// @ts-ignore
window.compatibiltiyTest = test
