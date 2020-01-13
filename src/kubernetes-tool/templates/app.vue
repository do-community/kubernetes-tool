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
    <div :class="`all do-bulma${Object.keys(toBeRendered).length === 0 ? ' landing' : ''}`">
        <div v-if="Object.keys(toBeRendered).length === 0">
            <SplashScreen @result="resultSet" />
        </div>
        <div v-else>
            <Header :title="i18n.templates.app.title">
                <template v-slot:description>
                </template>
                <template v-slot:header>
                </template>
                <template v-slot:buttons>
                    <a class="button" @click="mainMenu">{{ i18n.templates.shared.mainMenu }}</a>
                </template>
            </Header>

            <div class="main container">
                <CategorisationView :to-be-rendered="toBeRendered" :parsed="parsed"></CategorisationView>
            </div>

            <Footer :text="i18n.templates.app.oss" />
        </div>
    </div>
</template>

<script>
    import i18n from "../i18n"
    import SplashScreen from "./splash_screen"
    import CategorisationView from "./categorisation_view"
    import Header from "do-vue/src/templates/header"
    import Footer from "do-vue/src/templates/footer"
    import KubernetesParser from "../utils/kubernetes"
    import Categorisation from "../utils/categorisation"
    import { safeLoad } from "js-yaml"

    // A simple hack to handle the back/forward button.
    // This is fine since the site only consists of 3 files which will be cached anyway.
    // Reloading just ensures that it's a clean slate everytime (this could be why the user is going back - to try and solve a bug).
    const getUrlQuery = () => new URLSearchParams(window.location.search)
    const query = getUrlQuery()
    let helmQuery = query.has("helm") ? query.get("helm") : undefined
    let k8sQuery = query.has("k8s") ? query.get("k8s") : undefined
    window.addEventListener("popstate", () => {
        const urlQuery = getUrlQuery()
        if (helmQuery === urlQuery.get("helm") && k8sQuery === getUrlQuery.get("k8s")) return
        window.location.reload()
    })

    export default {
        name: "App",
        components: {
            SplashScreen,
            Header,
            Footer,
            CategorisationView,
        },
        data() {
            return {
                i18n,
                toBeRendered: {},
                fpDisplay: {},
                parsed: {},
                display: "initial",
                showReadme: true,
                lastItem: null,
            }
        },
        watch: {
            toBeRendered() {
                this.sort()
            },
        },
        methods: {
            sort() {
                const keys = []
                for (const index in this.$data.toBeRendered) keys.push(index)
                let note
                for (const keyIndex in keys) {
                    if (keys[keyIndex].includes("NOTES.txt")) {
                        note = [keyIndex, keys[keyIndex]]
                        break
                    }
                }
                if (note) keys.splice(note[0], 1)
                keys.sort()
                if (note) keys.unshift(note[1])
                const newObj = {}
                for (const k of keys) {
                    const value = this.$data.toBeRendered[k]
                    newObj[k] = value
                    this.$data.parsed[k] = this.kubeParse(k, value)
                    delete this.$data.toBeRendered[k]
                }
                for (const k in newObj) this.$data.toBeRendered[k] = newObj[k]
            },
            resultSet(obj) {
                this.$set(this.$data, "toBeRendered", obj)
            },
            kubeParse(filename, v) {
                // Defines the parsed data.
                let parsedData
                try {
                    parsedData = safeLoad(v)
                    if (!parsedData || parsedData.constructor !== Object) throw new Error()
                } catch (_) {
                    // Returns nothing.
                    return
                }

                Categorisation.insert(parsedData.kind, filename, parsedData)
                return KubernetesParser(parsedData)
            },
            mainMenu() {
                this.$data.toBeRendered = {}
                Categorisation.clear()
            },
        },
    }
</script>
