<template>
    <div>
        <div v-for="(key, index) in all.keys()">
            <h1>{{ key.name }}</h1>
            <p v-if="key.description">{{ key.description }}</p>
            <p>
                <a v-for="item in all.get(key)" href="#" class="button is-small" :key="item.fp" :style="{marginRight: '10px', marginBottom: '10px'}">
                    {{ item.fp }}
                </a>
            </p>
            <hr v-if="index !== Array.from(all.keys()).length - 1">
        </div>
    </div>
</template>

<script>
    import Categorisation from "../utils/categorisation"

    export default {
        name: "CategorisationView",
        data() {
            return {
                all: Categorisation.getAll(),
            }
        },
        updated() {
            this.$data.all = Categorisation.getAll()
        }
    }
</script>
