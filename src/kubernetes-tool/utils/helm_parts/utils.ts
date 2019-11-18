/*
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
*/

// Defines the mirror hostname.
let mirrorHostname = process.env.NODE_ENV === "development" ? "http://localhost:8001" : null

// Imports needed stuff.
import GitHubFS from "../githubFs"
import GitHTTPMirrorFS from "../gitHttpMirrorFs"

// The operator manager. Allows for operations to safely be evaled between 2 objects.
export class OperatorManager {
    public a: any
    public b: any
    public operator: string

    public constructor(a: any, b: any, operator: string) {
        this.a = a
        this.b = b
        this.operator = operator
    }

    public call(): boolean {
        return eval(`this.a ${this.operator} this.b`) as boolean
    }
}

// A small class to define a quote.
export class Quote {
    public text: string
    public constructor(text: string) {
        this.text = text
    }
}

// A statement in Helm.
export const helmStatement = /{{[ -]*([^}]+)[ -]*}}/g

// Defines the filesystem for the Helm Charts official repository.
export const fs = mirrorHostname ? new GitHTTPMirrorFS("helm", mirrorHostname) : new GitHubFS("helm/charts")
