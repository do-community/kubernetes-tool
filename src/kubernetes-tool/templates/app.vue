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
    <div class="kubernetes-tool">
        <div v-if="Object.keys(toBeRendered).length === 0">
            <SplashScreen :style="{maxWidth: '40%', margin: 'auto', textAlign: 'center', paddingTop: '40px'}" @result="resultSet" />
        </div>
        <div v-else :style="{padding: '20px'}">
            <div v-for="(v, k) in toBeRendered" :key="k">
                <SplitView :title="k" :yaml="v" :properties="kubeParse(v)" />
            </div>
        </div>
    </div>
</template>

<script>
    import i18n from "../i18n"
    import "../utils/helm"
    import SplashScreen from "./splash_screen"
    import SplitView from "./split_view"
    import KubernetesParser from "../utils/kubernetes"

    export default {
        name: "App",
        components: {
            SplashScreen,
            SplitView,
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
            kubeParse(v) {
                return KubernetesParser(v)
            },
        },
    }
</script>
