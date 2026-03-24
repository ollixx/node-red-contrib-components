function getNodeById(RED, nodeId) {
    if (!nodeId) {
        return null;
    }

    if (RED.nodes && typeof RED.nodes.getNode === "function") {
        const node = RED.nodes.getNode(nodeId);
        if (node) {
            return node;
        }
    }

    if (RED.nodes && typeof RED.nodes.eachNode === "function") {
        let found = null;
        RED.nodes.eachNode((candidate) => {
            if (!found && candidate.id === nodeId) {
                found = candidate;
            }
        });
        return found;
    }

    return null;
}

function isInvalidInSubflow(RED, node) {
    const owner = getNodeById(RED, node && node.z);
    return !!(owner && typeof owner.type === "string" && owner.type.startsWith("subflow"));
}

function findConnectedNodesByType(RED, nodeId, type = "component_out", foundNodes = {}, visited = new Set()) {
    if (visited.has(nodeId)) {
        return foundNodes;
    }

    visited.add(nodeId);
    const node = getNodeById(RED, nodeId);
    if (!node) {
        throw new Error("could not find node for id " + nodeId);
    }

    if (!Array.isArray(node.wires) || node.wires.length === 0) {
        return foundNodes;
    }

    node.wires.forEach((outPort) => {
        outPort.forEach((childId) => {
            const child = getNodeById(RED, childId);
            if (!child) {
                throw new Error("could not find child node for id " + childId);
            }

            if (child.type === type) {
                foundNodes[childId] = child;
            } else if (child.type === "link out") {
                if (Array.isArray(child.links)) {
                    child.links.forEach((linkId) => {
                        findConnectedNodesByType(RED, linkId, type, foundNodes, visited);
                    });
                } else if (Array.isArray(child.wires) && Array.isArray(child.wires[0])) {
                    child.wires[0].forEach((linkId) => {
                        findConnectedNodesByType(RED, linkId, type, foundNodes, visited);
                    });
                }
            }

            findConnectedNodesByType(RED, childId, type, foundNodes, visited);
        });
    });

    return foundNodes;
}

function getCallerHierarchy(RED, targetId, visited = new Set()) {
    const result = {};
    if (visited.has(targetId)) {
        return result;
    }

    visited.add(targetId);
    RED.nodes.eachNode((child) => {
        if (!Array.isArray(child.wires)) {
            return;
        }

        child.wires.forEach((port) => {
            port.forEach((nodeId) => {
                if (nodeId !== targetId) {
                    return;
                }

                if (child.type === "link in") {
                    const linkHierarchy = {
                        node: child,
                        callers: {}
                    };
                    (child.links || []).forEach((linkOutId) => {
                        const linkOutNode = getNodeById(RED, linkOutId);
                        if (linkOutNode) {
                            linkHierarchy.callers[linkOutId] = {
                                node: linkOutNode,
                                callers: getCallerHierarchy(RED, linkOutId, visited)
                            };
                        }
                    });
                    result[child.id] = linkHierarchy;
                    return;
                }

                result[child.id] = {
                    node: child,
                    callers: getCallerHierarchy(RED, child.id, visited)
                };
            });
        });
    });

    return result;
}

function findComponentInNodes(callers, found = {}) {
    Object.entries(callers).forEach(([id, entry]) => {
        if (entry.node.type === "component_in") {
            found[id] = entry.node;
        } else {
            findComponentInNodes(entry.callers, found);
        }
    });
    return found;
}

function getRunnerNodesForTarget(RED, targetComponentId) {
    const runners = [];
    RED.nodes.eachNode((node) => {
        if (node.type !== "component") {
            return;
        }

        const resolvedTargetId = node.targetComponentId || (node.targetComponent && node.targetComponent.id);
        if (resolvedTargetId === targetComponentId) {
            runners.push(node);
        }
    });
    return runners;
}

module.exports = {
    findComponentInNodes,
    findConnectedNodesByType,
    getCallerHierarchy,
    getNodeById,
    getRunnerNodesForTarget,
    isInvalidInSubflow
};