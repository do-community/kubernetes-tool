# Kubernetes Tool

A tool to explain Kubernetes files and Helm charts for the DigitalOcean Community.

---

## Development/Building

To setup the build/develop environment, you will need to run `npm i` with Node 12+ installed. This will install the
 dependencies to allow you to build the project.

To develop for this tool run `npm run dev`.
This will start a development server that will automatically reload the codebase when changes occur.

If you wish to host this tool on a service, simply run `npm run build`. This will run all the necessary build scripts
 automatically to build the tool.\
You can then take the `dist` folder and put it on your web server/bucket.

GitHub Actions is setup to do this automatically for this repository to deploy to gh-pages.
It is also configured to deploy each PR commit to DigitalOcean Spaces for PR previews.

## Source Structure

### [`src/kubernetes-tool`](./src/kubernetes-tool)

#### [`src/kubernetes-tool/assets`](./src/kubernetes-tool/assets)

This directory contains assets used by the tool, such as the SVG background designs for the landing screen of the tool.
These SVG assets are build to JS files in `build/svg` by the build scripts.

#### [`src/kubernetes-tool/i18n`](./src/kubernetes-tool/i18n)

In this directory lives all the internationalisation data and strings for the tool.
Currently, this only contains the English versions of the strings but could be expanded in the future.

#### [`src/kubernetes-tool/scss`](./src/kubernetes-tool/scss)

The scss directory contains the main SCSS styling file for the tool, which imports our do-bulma library and then adds
 tool-specific customisations.

#### [`src/kubernetes-tool/templates`](./src/kubernetes-tool/templates)

This directory contains all the Vue templates that are used to render the tool on the client-side.
`app.vue` is the main Vue file that all other templates are referenced into.

#### [`src/kubernetes-tool/utils`](./src/kubernetes-tool/utils)

In this directory is all the utility scripts (such as `githubFs` which provides fs like navigation of GitHub repos) and
 logic written in TypeScript that makes the tool work as expected.

### [`src/resource_definitions`](./src/resource_definitions)

The resource definitions directory contains all the (custom) resource definitions that the Kubernetes parser within the
 tool uses to understand Kubernetes files.
Included is a JavaScript import script that allows for new resource definitions to be loaded in.

## Contributing

If you are contributing, please read the [contributing file](CONTRIBUTING.md) before submitting your pull requests.
