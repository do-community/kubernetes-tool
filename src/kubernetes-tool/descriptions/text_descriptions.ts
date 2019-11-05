export default {
    Service: "A service is used to expose a set of pods in such a way that they can be easily balanced.",
    StatefulSet: "A stateful set is used to allow for the graceful modification of pods (up to the replica count) by updating them based on the position of the pod in the set.",
    Certificate: "This is a certificate which is used to link a HTTPS certificate to a domain.",
    Deployment: "This is a standard deployment which has no special rules when it comes to gracefully updating.",
} as Record<string, string>
