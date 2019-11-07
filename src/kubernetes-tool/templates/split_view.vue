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
        <hr>
        <p><b>{{ title }}</b> | <a @click="emit">{{ i18n.templates.splitView.back }}</a></p>
        <hr>
        <div class="columns">
            <div :class="`column${properties ? ' is-half' : ''}`">
                <prism :language="lang" :code="yaml" />
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
        },
        data() {
            return {
                ext: path.extname(this.$props.title).toLowerCase(),
                lang: this.$props.properties ? 'yaml' : this.ext === 'md' ? 'markdown' : undefined,
                i18n,
            }
        },
        methods: {
            emit() {
                this.$emit("back-event", this.$props.title)
            },
        },
    }
</script>
