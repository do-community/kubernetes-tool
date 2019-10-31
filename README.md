# Kubernetes Tool

A tool to explain Kubernetes files and Helm charts for the DigitalOcean Community.

---

## Development/Building

To setup the build/develop environment, you will need to run `npm i` with Node 12+ installed. This will install the
 dependencies to allow you to build the project.

To develop for this tool run `npm run dev`. This will start a development server that will automatically reload the codebase when changes occur.

If you wish to host these tools on a service, simply run `npm run build`. This will run all the necessary build scripts
 automatically to build all the tools present in the source folder.\
You can then take the `dist` folder and put it on your web server/bucket. \
Travis CI does this automatically for this repository to deploy to gh-pages.

## Contributing

If you are contributing, please read the [contributing file](CONTRIBUTING.md) before submitting your pull requests.
