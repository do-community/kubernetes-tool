<template>
    <div :style="`padding-left: ${$props.padding}px`">
        <div v-for="v in arr" v-bind:key="v[0]">
            <span v-if="typeof v[1] === 'string'">
                <p><code class="slim">{{ v[0] }}</code>: {{ v[1] }}</p>
            </span>
            <span v-else>
                <Properties :padding="padding + 30" :arr="v[1]" />
            </span>
        </div>
    </div>
</template>

<script>
    export default {
        name: "Properties",
        props: {
            padding: Number,
            arr: Array,
        },
    }
</script>
