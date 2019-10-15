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
        <div v-else v-for="v in arr" :key="v[0]">
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
            arr: Object,
        },
    }
</script>
