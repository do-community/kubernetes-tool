export default {
    description: "A tool to allow you to search for Helm charts (or insert in a Kubernetes file) and get descriptions of how they work.",
    selectionPrompt: "Do you want to load a Kubernetes file or a Helm chart?",
    helmTitle: "Helm Chart",
    helmDescription: "Enter the name of the helm chart:",
    helmErr: "Helm Parser Error",
    k8sErr: "Kubernetes Parser Error",
    helmDoesntExist: "The Helm chart does not seem to exist.",
    k8sTitle: "Kubernetes File",
    k8sDescription: "Copy the Kubernetes file into the textbox below:",
    submit: "Submit",
} as {[key: string]: string}
