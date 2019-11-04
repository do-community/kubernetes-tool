# Kubernetes Descriptions
Each YAML file in here accounts for descriptions which will show up on Kubernetes deployments. We welcome pull requests for custom resource definitions!

The base file (`base.yml`) follows a slightly different format since it is the parent of every other deployment. This is because it contains all of the base level descriptions before the spec.

Every other YAML file repersents a file. The file should be clearly marked by the kind which it repersents. The file starts from the `spec` key and is a dictionary. It follows the following structure:
```yaml
Key:
  base: "This is the description for this key."
  children:
    <this is a dictionary that should follow the same style as the base dictionary; this is designed for objects>
```
Commited YAML should use 2 spaces. After the file is created, you will need to import it into the `index.js` file. Import the file with the same filename you used for the above minus the extension.
```js
import Filename from "./filename.yml"
```
From here, you can add it to the exported dictionary:
```js
export default { ..., Filename }
```
