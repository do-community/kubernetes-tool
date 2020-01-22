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
    <div :style="{paddingLeft: `${$props.padding}px`}">
        <div v-for="v in handleArrayTrimming(arr)" :key="v.key">
            <p :id="`${filename}-${padding}-${v.key}-item2`" @mouseover="handleLine(v.key)"><code class="slim">{{ v.key }}</code>: {{ v.value }}</p>
            <span v-if="v.recursive">
                <Properties :filename="filename" :padding="padding + 30" :arr="v.recursive" />
            </span>
        </div>
    </div>
</template>

<script>
    import LineGenerator from "../utils/line_generation/line_generator"

    let visibleLine

    export default {
        name: "Properties",
        props: {
            filename: String,
            padding: Number,
            arr: Array
        },
        methods: {
            handleArrayTrimming(v) {
                const copy = []
                for (const i of v) {
                    if (i.value) copy.push(i)
                }
                return copy
            },
            handleLine(key) {
                const filename = this.$props.filename
                if (visibleLine) visibleLine.destroy()
                visibleLine = new LineGenerator(
                    document.getElementById(`${filename}-${this.$props.padding}-${key}-item1`),
                    document.getElementById(`${filename}-${this.$props.padding}-${key}-item2`),
                )
            },
        },
    }
</script>
