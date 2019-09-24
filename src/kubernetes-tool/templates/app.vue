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
    <div>
        <h1>{{ i18n.templates.app.title }}</h1>
        <p>Hello World! Check the console to see stuff. :)</p>
    </div>
</template>

<script>
    import i18n from "../i18n"

    export default {
        name: "App",
        data() {
            return {
                i18n,
            }
        },
    }
</script>
