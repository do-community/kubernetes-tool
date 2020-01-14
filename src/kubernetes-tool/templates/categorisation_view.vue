<template>
    <div>
        <hr :style="{marginTop: '10px'}">
        <p>When the chart is deployed, it should cost you an extra ${{ Categorisation.getCost() }} in additional resources such as block storage or load balancers.</p>
        <hr :style="{marginTop: '10px'}">
        <div v-for="allCats in [Categorisation.getAll()]">
            <div v-for="(key, index) in allCats.keys()" :key="key.name">
                <h2>{{ key.name }}</h2>
                <p v-if="key.description">
                    {{ key.description }} <a v-if="key.learnMore" :href="key.learnMore">Learn more...</a>
                </p>
                <div v-for="item in allCats.get(key)" :key="item.fp" :ref="item.fp">
                    <hr style="margin-top: 0">
                    <div class="columns is-gapless" style="margin: 0; user-select: none;">
                        <div class="column is-half">
                            <p>
                                <a style="text-decoration: none; color: black;" @click="handleItem(key, item)">
                                    {{ item.fp }}
                                </a>
                            </p>
                        </div>
                        <div class="column is-half">
                            <p style="text-align: right;">
                                <span v-if="(showing[key.name] || {})[item.fp] === undefined ? true : showing[key.name][item.fp]">
                                    -
                                </span>
                                <span v-else>
                                    +
                                </span>
                            </p>
                        </div>
                    </div>
                    <hr v-if="(showing[key.name] || {})[item.fp] === undefined ? true : showing[key.name][item.fp]" style="margin-top: 0">
                    <SplitView v-if="(showing[key.name] || {})[item.fp] === undefined ? true : showing[key.name][item.fp]" :title="item.fp" :yaml="toBeRendered[item.fp]" :properties="parsed[item.fp]"></SplitView>
                </div>
                <hr v-if="index !== Array.from(allCats.keys()).length - 1">
            </div>
        </div>
    </div>
</template>

<script>
    import Categorisation from "../utils/categorisation"
    import SplitView from "./split_view"

    export default {
        name: "CategorisationView",
        components: {
            SplitView,
        },
        props: {
            toBeRendered: Object,
            parsed: Object,
            handleHook: Function,
        },
        data() {
            return {
                Categorisation,
                showing: {},
            }
        },
        mounted() {
            const vm = this
            this.$props.handleHook(fp => vm.$refs[fp][0].scrollIntoView())
        },
        methods: {
            handleItem(key, item) {
                const exists = this.$data.showing[key.name] !== undefined
                const m = this.$data.showing[key.name] || {}
                this.$data.showing[key.name] = m
                if (!exists) {
                    // This starts off as true.
                    m[item.fp] = true
                }
                m[item.fp] = !m[item.fp]
                this.$forceUpdate() // Vue doesn't see the update above natively. We can nudge it.
            },
        },
    }
</script>
