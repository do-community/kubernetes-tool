<!--
Copyright 2021 DigitalOcean

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
        <hr :style="{marginTop: '10px'}">
        <p>When the chart is deployed, it should cost you an extra ${{ Categorisation.getCost() }} in additional resources such as block storage or load balancers.</p>
        <hr :style="{marginTop: '10px'}">
        <div v-for="allCats in [Categorisation.getAll()]">
            <div v-for="(key, index) in allCats.keys()" :key="key.name">
                <h2>{{ key.name }}</h2>
                <p v-if="key.description">
                    {{ key.description }} <ExternalLink v-if="key.learnMore" :link="key.learnMore" :text="i18n.templates.categorisationView.learnMore"></ExternalLink>
                </p>
                <div v-for="item in allCats.get(key)" :key="item.fp" :ref="item.fp">
                    <hr style="margin-top: 0">
                    <div class="columns is-gapless" style="margin: 0; user-select: none;">
                        <div class="column is-half">
                            <p>
                                <a style="text-decoration: none; color: black;" @click="handleItem(item)">
                                    {{ item.fp }}
                                </a>
                            </p>
                        </div>
                        <div class="column is-half">
                            <p style="text-align: right;">
                                <span v-if="showing[item.fp] === undefined ? true : showing[item.fp]">
                                    -
                                </span>
                                <span v-else>
                                    +
                                </span>
                            </p>
                        </div>
                    </div>
                    <hr v-if="showing[item.fp] === undefined ? true : showing[item.fp]" style="margin-top: 0">
                    <SplitView v-if="showing[item.fp] === undefined ? true : showing[item.fp]" :title="item.fp" :yaml="toBeRendered[item.fp]" :properties="parsed[item.fp]"></SplitView>
                </div>
                <hr v-if="index !== Array.from(allCats.keys()).length - 1">
            </div>
        </div>
    </div>
</template>

<script>
    import Categorisation from "../utils/categorisation"
    import SplitView from "./split_view"
    import ExternalLink from "do-vue/src/templates/external_link"
    import i18n from "../i18n"

    export default {
        name: "CategorisationView",
        components: {
            SplitView,
            ExternalLink,
        },
        props: {
            toBeRendered: Object,
            parsed: Object,
            handleHooks: Function,
        },
        data() {
            return {
                i18n,
                Categorisation,
                showing: {},
                globalState: true,
            }
        },
        mounted() {
            this.$props.handleHooks(fp => this.$refs[fp][0].scrollIntoView(), () => this.hideAll())
        },
        methods: {
            hideAll() {
                const catmap = Categorisation.getAll()
                this.$data.globalState = !this.$data.globalState
                for (const cat of catmap.keys()) {
                    for (const item of catmap.get(cat)) this.handleItem(item, true)
                }
                return this.$data.globalState
            },
            handleItem(item, globalState) {
                const exists = this.$data.showing[item.fp] !== undefined
                if (globalState) {
                    // Set it based off the global state.
                    this.$set(this.$data.showing, item.fp, this.$data.globalState)
                    return
                }
                if (!exists) {
                    // This starts off as true.
                    this.$set(this.$data.showing, item.fp, false)
                    return
                }
                this.$set(this.$data.showing, item.fp, !this.$data.showing[item.fp])
            },
        },
    }
</script>
