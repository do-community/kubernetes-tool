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
    <div :style="{paddingLeft: `${$props.padding}px`}">
        <div v-if="!arr">
            <p>This file could not be parsed.</p>
        </div>
        <div v-for="v in arr" v-else :key="v.key">
            <p><code class="slim">{{ v.key }}</code>: {{ v.value }}</p>
            <span v-if="v.recursive">
                <Properties :padding="padding + 30" :arr="manageRecursive(v)" />
            </span>
        </div>
    </div>
</template>

<script>
    export default {
        name: "Properties",
        props: ["padding", "arr"],
        methods: {
            manageRecursive(v) {
                for (const i of v.recursive) {
                    if (!i.value) i.value = v.value
                }
                return v.recursive
            },
        },
    }
</script>
