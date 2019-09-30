# Resource Definitions
This is where (custom) resource definitions go so that the Kubernetes parser can see them. If you have a popular resource defintion that is not here, feel free to make a pull request!

## How do I import a CRD?
Simply run `npm run import-crd <url or fp>`. The script will automatically import all the definitions from the YAML file specified.
