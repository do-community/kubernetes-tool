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
    <Landing :background-top="svgTop"
             :background-bottom="svgBottom"
             :title="title"
             :description="description"
             github="https://github.com/do-community/kubernetes-tool"
    >
        <div v-if="screen === 'splash'" class="container">
            <p>
                <a class="button is-primary" @click="setScreen('helm')">{{ i18n.templates.splashScreen.helmTitle }}</a>
                <a class="button is-primary" @click="setScreen('k8s')">{{ i18n.templates.splashScreen.k8sTitle }}</a>
            </p>
        </div>

        <div v-else-if="screen === 'helm'" class="container">
            <form ref="formHelm" autocomplete="on" @submit.prevent="execHelm">
                <div class="input-container">
                    <label for="helmInput" class="hidden">{{ i18n.templates.splashScreen.helmTitle }}</label>
                    <i class="fas fa-dharmachakra"></i>
                    <vue-autosuggest
                        v-model="helmId"
                        :suggestions="helmSuggestions"
                        :input-props="{id: 'helmInput', class: 'input', type: 'text', placeholder: i18n.templates.splashScreen.helmTitle, style: {width: '100%', textIndent: '30px'}}"
                        :style="{width: '100%'}"
                        @input="inputChange"
                        @selected="inputSelect"
                    >
                        <template slot-scope="{suggestion}">
                            <span :style="{cursor: 'default'}">{{ suggestion.item }}</span>
                            <hr :style="{marginTop: '5px', marginBottom: '5px'}" />
                        </template>
                    </vue-autosuggest>
                    <button id="submitHelm" class="button is-primary" :click="submitHelm" :style="{marginTop: '20px', marginBottom: '20px'}">
                        {{ i18n.templates.splashScreen.submit }}
                    </button>
                </div>
            </form>

            <a class="button" @click="setScreen('splash')">{{ i18n.templates.shared.mainMenu }}</a>
        </div>

        <div v-else-if="screen === 'k8s'" class="container">
            <form ref="formK8s" autocomplete="on" @submit.prevent="execK8s">
                <div class="input-container">
                    <label for="helmInput" class="hidden">{{ i18n.templates.splashScreen.k8sTitle }}</label>
                    <prism-editor v-model="k8s" language="yaml"></prism-editor>
                    <input type="hidden" />
                    <button id="submitK8s" class="button is-primary" :click="submitK8s" style="align-self:flex-end">
                        {{ i18n.templates.splashScreen.submit }}
                    </button>
                </div>
            </form>

            <a class="button" @click="setScreen('splash')">{{ i18n.templates.shared.mainMenu }}</a>
        </div>

        <div v-else-if="screen === 'helmErr'" class="container">
            <p>
                <a class="button" @click="setScreen('splash')">{{ i18n.templates.shared.mainMenu }}</a>
            </p>
        </div>

        <div v-else-if="screen === 'k8sErr'" class="container">
            <p>
                <a class="button" @click="setScreen('splash')">{{ i18n.templates.shared.mainMenu }}</a>
            </p>
        </div>
    </Landing>
</template>

<script>
    import Landing from "do-vue/src/templates/landing"
    import "prismjs"
    import "vue-prism-editor/dist/VuePrismEditor.css"
    import PrismEditor from "vue-prism-editor"
    import { safeLoad } from "js-yaml"
    import { VueAutosuggest } from "vue-autosuggest"
    import i18n from "../i18n"
    import { fs } from "../utils/helm"
    import { HelmCoreParser } from "../utils/helm"
    import svgTop from "../../../build/svg/top.svg"
    import svgBottom from "../../../build/svg/bottom.svg"

    const titlesAndDescriptions = {
        splash: {
            title: i18n.templates.app.title,
            description: i18n.templates.splashScreen.whereDoYouWantToGoToday,
        },
        helm: {
            title: i18n.templates.splashScreen.helmTitle,
            description: i18n.templates.splashScreen.helmDescription,
        },
        k8s: {
            title: i18n.templates.splashScreen.k8sTitle,
            description: i18n.templates.splashScreen.k8sDescription,
        },
        k8sErr: {
            title: i18n.templates.splashScreen.k8sErr,
            description: "",
        },
        helmErr: {
            title: i18n.templates.splashScreen.helmErr,
            description: "",
        },
    }

    export default {
        name: "SplashScreen",
        components: {
            Landing,
            PrismEditor,
            VueAutosuggest,
        },
        data() {
            return {
                i18n,
                screen: "splash",
                helmId: "",
                k8s: "",
                title: titlesAndDescriptions.splash.title,
                description: titlesAndDescriptions.splash.description,
                helmSuggestions: [],
                svgTop,
                svgBottom,
            }
        },
        methods: {
            async inputChange() {
                const helmId = this.$data.helmId

                if (helmId.includes("/")) {
                    const split = helmId.split("/")
                    const start = split.shift()
                    this.$data.helmSuggestions = [
                        {
                            data: await fs.queryStartAll(start, split.join("/"), 10),
                        },
                    ]
                } else {
                    this.$data.helmSuggestions = []
                }
            },
            setScreen(type) {
                this.$data.screen = type
                this.$data.helmId = ""
                this.$data.helmSuggestions = []
                this.$data.k8s = "\n"
                this.$data.title = titlesAndDescriptions[type].title
                this.$data.description = titlesAndDescriptions[type].description
            },
            inputSelect(suggestion) {
                console.log(suggestion)
                if (suggestion) this.$data.helmId = suggestion.item
                this.execHelm()
            },
            submitK8s() {
                this.$refs.formK8s.submit()
            },
            execK8s() {
                const el = document.getElementById("submitK8s")
                el.classList.add("is-loading")

                const d = this.$data.k8s
                try {
                    const x = safeLoad(d)
                    if (!x || x.constructor !== Object) {
                        this.setScreen("k8sErr")
                        this.$data.description += "Expected an object."
                        return
                    }
                } catch (e) {
                    el.classList.remove("is-loading")
                    this.setScreen("k8sErr")
                    this.$data.description += String(e)
                    return
                }

                el.classList.remove("is-loading")
                this.setScreen("splash")
                this.$emit("result", { "Kubernetes File": d })
            },
            submitHelm() {
                this.$refs.formHelm.submit()
            },
            async execHelm() {
                const el = document.getElementById("submitHelm")
                el.classList.add("is-loading")

                const coreParser = new HelmCoreParser({}, this.$data.helmId)
                let res
                try {
                    res = await coreParser.promise
                } catch (e) {
                    el.classList.remove("is-loading")
                    this.setScreen("helmErr")
                    this.$data.description += String(e)
                    return
                }

                if (!res) {
                    el.classList.remove("is-loading")
                    this.setScreen("helmErr")
                    this.$data.description += i18n.templates.splashScreen.helmDoesntExist
                    return
                }

                el.classList.remove("is-loading")
                this.setScreen("splash")
                this.$emit("result", res)
            },
        },
    }
</script>
