function getEndpointId(endpoint) {
    if (!endpoint) {
        return null;
    }

    if (typeof endpoint === "string") {
        return endpoint;
    }

    return endpoint.id || null;
}

function findStartNodes(RED, nodeId, visited = new Set(), found = new Set()) {
    if (!nodeId || visited.has(nodeId)) {
        return found;
    }

    visited.add(nodeId);

    const node = RED.nodes.node(nodeId);
    if (!node) {
        return found;
    }

    if (node.type === "component_in") {
        found.add(nodeId);
    }

    RED.nodes.eachLink((link) => {
        if (getEndpointId(link && link.target) !== nodeId) {
            return;
        }

        const sourceId = getEndpointId(link && link.source);
        if (sourceId) {
            findStartNodes(RED, sourceId, visited, found);
        }
    });

    if (node.type === "link in" && Array.isArray(node.links)) {
        node.links.forEach((linkOutId) => {
            findStartNodes(RED, linkOutId, visited, found);
        });
    }

    return found;
}

function getComponentReturnValidationResult(RED, node) {
    const startNodes = Array.from(findStartNodes(RED, node && node.id));
    if (startNodes.length === 0) {
        return {
            codes: ["notConnected"],
            message: RED._("components.message.componentNotConnected")
        };
    }

    if (startNodes.length > 1) {
        return {
            codes: ["tooManyStartNodes"],
            message: RED._("components.message.returnWithoutStart", { inNodeLength: startNodes.length })
        };
    }

    return { codes: [], message: "" };
}

module.exports = {
    findStartNodes,
    getComponentReturnValidationResult
};