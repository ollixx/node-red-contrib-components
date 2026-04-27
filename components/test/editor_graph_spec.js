var should = require("should");
var editorGraph = require("../lib/editor-graph");

function createEditorRed(nodes, links) {
    return {
        _: function (key, args) {
            if (key === "components.message.returnWithoutStart") {
                return key + ":" + args.inNodeLength;
            }
            return key;
        },
        nodes: {
            node: function (id) {
                return nodes[id] || null;
            },
            eachLink: function (callback) {
                links.forEach(callback);
            }
        }
    };
}

describe("editor graph helpers", function () {
    it("should validate component_out through junction links", function () {
        var red = createEditorRed(
            {
                in01: { id: "in01", type: "component_in" },
                junction01: { id: "junction01", type: "junction" },
                ret01: { id: "ret01", type: "component_out" }
            },
            [
                { source: { id: "in01" }, target: { id: "junction01" } },
                { source: { id: "junction01" }, target: { id: "ret01" } }
            ]
        );

        editorGraph.getComponentReturnValidationResult(red, { id: "ret01" }).should.eql({
            codes: [],
            message: ""
        });
    });

    it("should ignore malformed links while finding start nodes", function () {
        var red = createEditorRed(
            {
                in01: { id: "in01", type: "component_in" },
                junction01: { id: "junction01", type: "junction" },
                ret01: { id: "ret01", type: "component_out" }
            },
            [
                { source: { id: "in01" }, target: { id: "junction01" } },
                { source: "junction01", target: "ret01" },
                { source: undefined, target: { id: "ret01" } },
                { source: { id: "missing" }, target: null }
            ]
        );

        Array.from(editorGraph.findStartNodes(red, "ret01")).should.eql(["in01"]);
    });

    it("should report multiple component starts as invalid", function () {
        var red = createEditorRed(
            {
                in01: { id: "in01", type: "component_in" },
                in02: { id: "in02", type: "component_in" },
                junction01: { id: "junction01", type: "junction" },
                ret01: { id: "ret01", type: "component_out" }
            },
            [
                { source: { id: "in01" }, target: { id: "junction01" } },
                { source: { id: "in02" }, target: { id: "junction01" } },
                { source: { id: "junction01" }, target: { id: "ret01" } }
            ]
        );

        editorGraph.getComponentReturnValidationResult(red, { id: "ret01" }).should.eql({
            codes: ["tooManyStartNodes"],
            message: "components.message.returnWithoutStart:2"
        });
    });

    it("should be valid when one component_in and one non-start node both feed the same junction", function () {
        var red = createEditorRed(
            {
                in01: { id: "in01", type: "component_in" },
                change01: { id: "change01", type: "change" },
                junction01: { id: "junction01", type: "junction" },
                ret01: { id: "ret01", type: "component_out" }
            },
            [
                { source: { id: "in01" }, target: { id: "junction01" } },
                { source: { id: "change01" }, target: { id: "junction01" } },
                { source: { id: "junction01" }, target: { id: "ret01" } }
            ]
        );

        editorGraph.getComponentReturnValidationResult(red, { id: "ret01" }).should.eql({
            codes: [],
            message: ""
        });
    });
});