var should = require("should");
var graphHelpers = require("../lib/runtime-graph");

function createRed(nodes, options) {
    options = options || {};
    return {
        nodes: {
            getNode: options.disableGetNode ? function () { return null; } : function (id) { return nodes[id] || null; },
            eachNode: function (callback) {
                Object.keys(nodes).forEach(function (id) {
                    callback(nodes[id]);
                });
            }
        }
    };
}

describe("runtime graph helpers", function () {
    it("should fall back to eachNode when getNode is unavailable", function () {
        var node = { id: "in01", type: "component_in" };
        var red = createRed({ in01: node }, { disableGetNode: true });

        should(graphHelpers.getNodeById(red, "in01")).equal(node);
    });

    it("should detect subflow ownership via parent z", function () {
        var red = createRed({
            subflow01: { id: "subflow01", type: "subflow:test" },
            tab01: { id: "tab01", type: "tab" }
        });

        graphHelpers.isInvalidInSubflow(red, { z: "subflow01" }).should.equal(true);
        graphHelpers.isInvalidInSubflow(red, { z: "tab01" }).should.equal(false);
    });

    it("should follow link nodes and avoid cycles when finding return nodes", function () {
        var red = createRed({
            start: { id: "start", type: "component_in", wires: [["change01", "linkOutOld", "linkOutNew"]] },
            change01: { id: "change01", type: "change", wires: [["start"]] },
            linkOutOld: { id: "linkOutOld", type: "link out", links: ["linkInOld"], wires: [] },
            linkInOld: { id: "linkInOld", type: "link in", wires: [["ret01"]] },
            linkOutNew: { id: "linkOutNew", type: "link out", wires: [["linkInNew"]] },
            linkInNew: { id: "linkInNew", type: "link in", wires: [["ret02"]] },
            ret01: { id: "ret01", type: "component_out", wires: [] },
            ret02: { id: "ret02", type: "component_out", wires: [] }
        });

        var foundNodes = graphHelpers.findConnectedNodesByType(red, "start");
        Object.keys(foundNodes).sort().should.eql(["ret01", "ret02"]);
    });

    it("should traverse caller hierarchies back to component definitions", function () {
        var red = createRed({
            in01: { id: "in01", type: "component_in", wires: [["change01"]] },
            change01: { id: "change01", type: "change", wires: [["ret01"]] },
            ret01: { id: "ret01", type: "component_out", wires: [] }
        });

        var hierarchy = graphHelpers.getCallerHierarchy(red, "ret01");
        var foundInNodes = graphHelpers.findComponentInNodes(hierarchy);

        Object.keys(foundInNodes).should.eql(["in01"]);
    });

    it("should find component_in through a junction when only one component_in feeds into it", function () {
        var red = createRed({
            in01: { id: "in01", type: "component_in", wires: [["junction01"]] },
            change01: { id: "change01", type: "change", wires: [["junction01"]] },
            junction01: { id: "junction01", type: "junction", wires: [["ret01"]] },
            ret01: { id: "ret01", type: "component_out", wires: [] }
        });

        var hierarchy = graphHelpers.getCallerHierarchy(red, "ret01");
        var foundInNodes = graphHelpers.findComponentInNodes(hierarchy);

        Object.keys(foundInNodes).should.eql(["in01"]);
    });

    it("should resolve runner nodes via targetComponentId or legacy targetComponent", function () {
        var red = createRed({
            run01: { id: "run01", type: "component", targetComponentId: "in01" },
            run02: { id: "run02", type: "component", targetComponent: { id: "in01" } },
            run03: { id: "run03", type: "component", targetComponentId: "in02" }
        });

        graphHelpers.getRunnerNodesForTarget(red, "in01").map(function (node) { return node.id; }).sort().should.eql(["run01", "run02"]);
    });
});