(async () => {
    const fp = process.argv[process.argv.length - 1]

    const fetch = require("node-fetch")
    if (fp.toLowerCase().match(/^(http)|(https)|(ftp):\/\/.+$/)) {
        // Get as a URL.
        const res = await fetch(fp)
        const r = await res.text()
        if (!res.ok) throw r
        return r
    }

    // This is a file stored locally.
    return require("fs").readFileSync(fp)
})().then(file => {
    // Parse the YAML.
    file = require("js-yaml").safeLoadAll(file)
    const writeFileSync = require("fs").writeFileSync
    for (const part of file) {
        if (typeof(part) !== "object" || !part) {
            console.info("Part is not an object, skipping this part!")
            continue
        }
        if (part.kind !== "CustomResourceDefinition") {
            console.info("Part is not an CRD, skipping this part!")
            continue
        }
        const json = require("./index.json")
        const name = part.spec.names.kind
        const group = part.spec.group
        const save = key => {
            if (json[key][name]) console.log("Previous version of resource found. Adding this one into the versions!")
            else json[key][name] = {}
            for (const v of part.spec.versions) json[key][name][v.name] = part.spec.validation.openAPIV3Schema
        }
        let found = false
        for (const key in json) {
            if (group.match(new RegExp(key))) {
                // This is the namespace.
                console.log("Namespace found! Dropping it here.")
                save(key)
                found = true
                break
            }
        }
        if (!found) {
            // Creating the namespace.
            console.log("Creating the namespace and dropping definition in...")
            const split = group.split(".")
            const sub = split.pop()
            const domain = split.pop()
            const parts = [domain, sub]
            let text = ""
            if (split.length !== 0) text = `(${split.join(".")}.)*`
            const k = `${text}${parts.join(".")}`.replace(/-/g, "-*").replace(/\./g, "\\.").replace("\\.io", "(\\.k8s)*\\.io")
            json[k] = {}
            save(k)
        }
        writeFileSync("./src/resource_definitions/index.json", JSON.stringify(json))
    }
}).catch(e => {
    console.error(e)
    process.exit(1)
})
