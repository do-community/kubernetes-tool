import base from "./base.yml"
import Service from "./Service.yml"
import StatefulSet from "./StatefulSet.yml"
import Deployment from "./Deployment.yml"

export default { base, Deployment, Service, StatefulSet }

// Ignore this if you're just editing YAML descriptions. This is to do with text descriptions and learn more links.
import textDescriptions from "./text_descriptions"
import learnMore from "./learn_more"
export { textDescriptions, learnMore }
