<!--
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
-->

<template>
    <div>
        <div class="columns">
            <div :class="`column${properties ? ' is-half' : ''}`">
                <span v-for="part in splitYaml()" :id="`${title}-${part[0]}-${part[2]}-item1`">
                    <prism :language="lang" :code="part[1]" style="padding-top: 0; padding-bottom: 0; margin: 0 !important;" />
                </span>
            </div>
            <div v-if="properties" :class="`column${properties ? ' is-half' : ''}`">
                <Properties :padding="0" :arr="properties" :filename="title" />
            </div>
        </div>
    </div>
</template>

<script>
    import Prism from "vue-prism-component"
    import "prismjs/components/prism-yaml"
    import "prismjs/components/prism-markdown"
    import * as path from "path"
    import Properties from "./properties"
    import descriptions from "../descriptions"
    import i18n from "../i18n"

    export default {
        name: "SplitView",
        components: {
            Prism,
            Properties,
        },
        props: {
            // The title.
            title: String,

            // The YAML.
            yaml: String,

            // The properties. The properties are an array of string:string (or same array type) arrays to repersent K/V and recursiveness.
            properties: Array,

            // The type of the deployment.
            type: String,
        },
        data() {
            return {
                ext: path.extname(this.$props.title).toLowerCase(),
                lang: this.$props.properties ? 'yaml' : this.ext === 'md' ? 'markdown' : undefined,
                i18n,
            }
        },
        methods: {
            splitYaml() {
                // The last spacing.
                let lastSpacing

                // The array of handlers.
                const arr = []

                // All of the keys for the YAML.
                let keys = []

                // Get the spacing for the item.
                let spacing = 0

                // Gets the current text for the YAML part.
                let currentText = ""

                // Split the YAML by the new line.
                const yamlNewLineSplit = this.$props.yaml.split("\n")
                if (yamlNewLineSplit[yamlNewLineSplit.length - 1] === "") yamlNewLineSplit.pop()

                // Process the text.
                const processText = () => {
                    // Push everything to the array.
                    arr.push([spacing, currentText, keys[keys.length - 1]])

                    // Prepare currentText.
                    currentText = ""
                }

                // Check if there's a dash in the current line.
                let dashCurrent = false

                // Iterate by new line.
                for (const newline of yamlNewLineSplit) {
                    // Get the key match.
                    const match = newline.match(/([\t -]*)([\w\d]+)\: *.*/)

                    // Add this to current text.
                    currentText += `${newline}\n`

                    if (!match) {
                        // Not a key match.
                        continue
                    }

                    // Check if there is a dash in the last line.
                    const dashLast = dashCurrent
                    dashCurrent = match[1].includes("-")

                    // Check last spacing isn't undefined.
                    if (!lastSpacing) lastSpacing = ""

                    // This is a new key on the same base level.
                    if (lastSpacing === match[1]) {
                        // Pop the last key.
                        keys.pop()

                        // Add the key.
                        keys.push(match[2])

                        // Process the text.
                        processText()

                        // Continue here.
                        continue
                    }

                    if (lastSpacing.length > match[1].length) {
                        // This is the key behind the current one.

                        // Subtract the spacing.
                        if (match[1] === "") spacing = 0
                        else spacing -= 30

                        // Set the spacing.
                        lastSpacing = match[1]

                        // Add the key.
                        keys.push(match[2])

                        // Processes the text.
                        processText()
                    } else {
                        // This is a sub-key.

                        // Ignore if this is in array.
                        if (!dashLast) {
                            // Add the spacing.
                            spacing += 30

                            // Set the spacing.
                            lastSpacing = match[1]

                            // Readd the key.
                            keys.push(match[2])
                        }

                        // Processes the text.
                        processText()
                    }
                }

                // Process the final thing.
                if (currentText === "") processText()

                // Return the array.
                return arr
            },
        },
    }
</script>
