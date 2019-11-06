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
    <div class="all do-bulma">
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
                <CategorisationView></CategorisationView>
                <div v-for="(v, k) in toBeRendered" :key="k">
                    <SplitView :title="k" :yaml="v" :properties="kubeParse(k, v)" />
                </div>
            </div>

            <Footer :text="i18n.templates.app.oss" />
        </div>
    </div>
</template>

<script>
    import i18n from "../i18n"
    import SplashScreen from "./splash_screen"
    import SplitView from "./split_view"
    import CategorisationView from "./categorisation_view"
    import Header from "do-vue/src/templates/header"
    import Footer from "do-vue/src/templates/footer"
    import KubernetesParser from "../utils/kubernetes"
    import Categorisation from "../utils/categorisation"
    import { safeLoad } from "js-yaml"

    export default {
        name: "App",
        components: {
            SplashScreen,
            SplitView,
            Header,
            Footer,
            CategorisationView,
        },
        data() {
            return {
                i18n,
                toBeRendered: {},
            }
        },
        methods: {
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
