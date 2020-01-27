<!--
Copyright 2019-2020 DigitalOcean

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
            <p style="margin-bottom: 20px">
                {{ i18n.templates.splashScreen.selectionPrompt }}
            </p>
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
                        :input-props="{
                            id: 'helmInput', class: 'input', type: 'text',
                            placeholder: i18n.templates.splashScreen.helmTitle,
                            style: {width: '80%', textIndent: '30px'},
                            readonly: readonly,
                        }"
                        style="width: 100%"
                        @input="inputChange"
                        @selected="inputSelect"
                    >
                        <template slot-scope="{suggestion}">
                            <div style="background-color: white">
                                <p style="margin: 0; text-align: left; font-size: 17px;">
                                    <a tabindex="0" @click="inputSelect(suggestion)">
                                        {{ suggestion.item }}
                                    </a>
                                </p>
                            </div>
                        </template>

                        <template slot="after-input">
                            <button ref="submitHelm" class="button is-primary" :click="submitHelm">
                                {{ i18n.templates.splashScreen.submit }}
                            </button>
                        </template>
                    </vue-autosuggest>
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
                    <button ref="submitK8s" class="button is-primary" :click="submitK8s" style="align-self:flex-end">
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
    import { fs, HelmCoreParser } from "../utils/helm"
    import svgTop from "../../../build/svg/top.svg"
    import svgBottom from "../../../build/svg/bottom.svg"

    const titlesAndDescriptions = {
        splash: {
            title: i18n.templates.app.title,
            description: i18n.templates.splashScreen.description,
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

    let shown = false

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
                readonly: false,
            }
        },
        mounted() {
            if (shown) this.setUrl()
            shown = true
            const url = new URL(window.location.href)
            const params = new URLSearchParams(url.search)
            const helm = params.get("helm")
            const k8s = params.get("k8s")
            if (helm) {
                // This is a Helm chart.
                this.setScreen("helm")
                this.$nextTick(() => {
                    this.$data.helmId = helm
                    this.execHelm()
                })
            } else if (k8s) {
                // This is a Kubernetes deployment.
                this.setScreen("k8s")
                this.$nextTick(() => {
                    this.$data.k8s = atob(k8s)
                    this.execK8s()
                })
            } else {
                // Set the URL if these are not set.
                this.setUrl()
            }
        },
        methods: {
            setUrl(k, v) {
                const url = new URL(window.location.href)
                const params = new URLSearchParams("")
                if (k && v) params.set(k, v)
                url.search = params.toString()
                const u = url.toString()
                if (u !== window.location.href) window.history.pushState({}, "", u)
            },
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
                    if (helmId === "") this.$data.helmSuggestions = []
                    else this.$data.helmSuggestions = [
                        {
                            data: await fs.queryStartAll("stable", helmId, 10),
                        },
                    ]
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
                if (suggestion) this.$data.helmId = suggestion.item
                this.execHelm()
            },
            submitK8s() {
                this.$refs.formK8s.submit()
            },
            execK8s() {
                const el = this.$refs.submitK8s
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
                this.setUrl("k8s", btoa(d))
            },
            submitHelm() {
                this.$refs.formHelm.submit()
            },
            async execHelm() {
                const el = this.$refs.submitHelm
                this.$data.readonly = true
                el.classList.add("is-loading")
                this.$data.helmSuggestions = []

                const helmId = this.$data.helmId
                const coreParser = new HelmCoreParser({}, helmId)
                let res
                try {
                    res = await coreParser.promise
                } catch (e) {
                    el.classList.remove("is-loading")
                    this.$data.readonly = false
                    this.setScreen("helmErr")
                    this.$data.description += String(e)
                    return
                }

                if (!res) {
                    el.classList.remove("is-loading")
                    this.$data.readonly = false
                    this.setScreen("helmErr")
                    this.$data.description += i18n.templates.splashScreen.helmDoesntExist
                    return
                }

                el.classList.remove("is-loading")
                this.$data.readonly = false
                this.setScreen("splash")
                this.$emit("result", res)
                this.setUrl("helm", helmId)
            },
        },
    }
</script>
