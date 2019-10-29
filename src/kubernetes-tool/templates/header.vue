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
    <div class="header">
        <div class="container">
            <div>
                <h1><a :href="baseUrl">{{ $props.title }}</a></h1>
                <h3><slot name="description"></slot></h3>
                <slot name="header"></slot>
            </div>

            <form>
                <div class="buttons">
                    <slot name="buttons"></slot>
                </div>
            </form>
        </div>
    </div>
</template>

<script>
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`

    export default {
        name: "Header",
        props: {
            title: String,
        },
        data() {
            return {
                baseUrl,
            }
        },
    }
</script>
