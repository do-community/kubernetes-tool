<template>
    <div>
        <hr :style="{marginTop: '10px'}">
        <p>When the chart is deployed, it should cost you an extra ${{ Categorisation.getCost() }} in additional resources such as block storage or load balancers.</p>
        <hr :style="{marginTop: '10px'}">
        <div v-for="allCats in [Categorisation.getAll()]">
            <div v-for="(key, index) in allCats.keys()" :key="key.name">
                <h2>{{ key.name }}</h2>
                <p v-if="key.description">
                    {{ key.description }}
                </p>
                <p>
                    <a v-for="item in allCats.get(key)" :key="item.fp" class="button is-small" :style="{marginRight: '10px', marginBottom: '10px'}" @click="handleItem(item.fp, key.name)">
                        {{ item.fp }}
                    </a>
                </p>
                <div v-if="visible === key.name">
                    <hr>
                    <p><b>{{ splitViewTitle }}</b></p>
                    <hr>
                    <SplitView :title="splitViewTitle" :yaml="splitViewYaml" :properties="splitViewParsed"></SplitView>
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
        },
        data() {
            return {
                Categorisation,
                visible: null,
                splitViewTitle: null,
                splitViewYaml: null,
                splitViewParsed: null,
            }
        },
        methods: {
            handleItem(fp, catKey) {
                if (this.$data.splitViewTitle === fp) {
                    this.$data.visible = null
                    this.$data.splitViewTitle = null
                    return
                }
                this.$data.splitViewTitle = fp
                this.$data.splitViewYaml = this.$props.toBeRendered[fp]
                this.$data.splitViewParsed = this.$props.parsed[fp]
                this.$data.visible = catKey
            },
        },
    }
</script>
