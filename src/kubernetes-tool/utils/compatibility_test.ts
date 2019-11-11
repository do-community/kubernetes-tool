import { fs } from "../utils/helm_parts/utils"
// @ts-ignore
import { HelmCoreParser } from "./helm"

class CompatibiltiyTest {
    // Runs the compatibility test.
    public async test() {
        let errors = ""
        let passed = ""
        const promises = []
        for (const item of await fs.ls("stable")) {
            if (!item.file) {
                promises.push(new HelmCoreParser({}, item.path).promise.then(() => {
                    passed += item.path + "\n"
                }).catch(err => {
                    errors += `${item.path}: ${err}\n`
                }))
            }
        }
        await Promise.all(promises)
        console.log(`Failed\n---\n${errors}\nPassed\n---\n${passed}`)
    }
}

// @ts-ignore
window.compatibiltiyTest = new CompatibiltiyTest().test
