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
    <div v-if="screen === 'splash'">
        <h1 class="title">
            {{ i18n.templates.app.title }}
        </h1>
        <p>{{ i18n.templates.splashScreen.whereDoYouWantToGoToday }}</p>
        <p>
            <a class="button" @click="setScreen('helm')">{{ i18n.templates.splashScreen.helmTitle }}</a>
            <a class="button" @click="setScreen('k8s')">{{ i18n.templates.splashScreen.k8sTitle }}</a>
        </p>
    </div>
    <div v-else-if="screen === 'helm'">
        <h1 class="title">
            {{ i18n.templates.splashScreen.helmTitle }}
        </h1>
        <p>{{ i18n.templates.splashScreen.helmDescription }}</p>
        <form autocomplete="on" @submit.prevent="execHelm">
            <input v-model="helmId" class="input" type="text" :placeholder="i18n.templates.splashScreen.helmTitle">
            <br><br>
            <a class="button" @click="setScreen('splash')">{{ i18n.templates.splashScreen.mainMenu }}</a>
            <input class="button" type="submit" value="Submit">
        </form>
    </div>
    <div v-else-if="screen === 'k8s'">
        <h1 class="title">
            {{ i18n.templates.splashScreen.k8sTitle }}
        </h1>
        <p>{{ i18n.templates.splashScreen.k8sDescription }}</p>
        <prism-editor v-model="k8s" language="yaml"></prism-editor>
        <form autocomplete="on" @submit.prevent="execK8s">
            <br>
            <a class="button" @click="setScreen('splash')">{{ i18n.templates.splashScreen.mainMenu }}</a>
            <input class="button" type="submit" value="Submit">
        </form>
    </div>
    <div v-else-if="screen === 'helmErr'">
        <h1 class="title">
            {{ i18n.templates.splashScreen.helmErr }}
        </h1>
        <p>{{ err }}</p>
        <p>
            <a class="button" @click="setScreen('splash')">{{ i18n.templates.splashScreen.mainMenu }}</a>
        </p>
    </div>
    <div v-else-if="screen === 'k8sErr'">
        <h1 class="title">
            {{ i18n.templates.splashScreen.k8sErr }}
        </h1>
        <p>{{ err }}</p>
        <p>
            <a class="button" @click="setScreen('splash')">{{ i18n.templates.splashScreen.mainMenu }}</a>
        </p>
    </div>
</template>

<script>
    import i18n from "../i18n"
    import { HelmCoreParser } from "../utils/helm"
    import PrismEditor from "vue-prism-editor"
    import { safeLoad } from "js-yaml"

    export default {
        name: "SplashScreen",
        components: {
            PrismEditor,
        },
        data() {
            return {
                i18n,
                screen: "splash",
                helmId: "",
                err: "",
                k8s: "",
            }
        },
        methods: {
            setScreen(type) {
                this.$data.screen = type
                this.$data.helmId = ""
                this.$data.err = ""
                this.$data.k8s = ""
            },
            execK8s() {
                const d = this.$data.k8s
                try {
                    const x = safeLoad(d)
                    if (!x || x.constructor !== Object) {
                        this.setScreen("k8sErr")
                        this.$data.err += "Expected an object."
                        return
                    }
                } catch (e) {
                    this.setScreen("k8sErr")
                    this.$data.err += String(e)
                    return
                }
                this.setScreen("splash")
                this.$emit("result", {"Kubernetes File": d})
            },
            async execHelm() {
                const coreParser = new HelmCoreParser({}, this.$data.helmId)
                let res
                try {
                    res = await coreParser.promise
                } catch (e) {
                    this.setScreen("helmErr")
                    this.$data.err += String(e)
                    return
                }
                if (!res) {
                    this.setScreen("helmErr")
                    this.$data.err += i18n.templates.splashScreen.helmDoesntExist
                    return 
                }
                this.setScreen("splash")
                this.$emit("result", res)
            },
        },
    }
</script>