var should = require("should");
var helper = require("node-red-node-test-helper");
var componentStart = require("../component-start.js");
var componentReturn = require("../component-return.js");
var runComponent = require("../run-component.js");

helper.init(require.resolve("node-red"));

function createIssue62Flow() {
    return [
        { id: "tab", type: "tab", label: "Issue 62" },
        {
            id: "run01",
            type: "component",
            z: "tab",
            name: "run parent",
            targetComponentId: "in01",
            paramSources: {},
            statuz: "",
            statuzType: "str",
            outputs: 1,
            outLabels: ["default"],
            wires: [["debug01"]]
        },
        {
            id: "in01",
            type: "component_in",
            z: "tab",
            name: "parent start",
            api: [],
            wires: [["run02"]]
        },
        {
            id: "run02",
            type: "component",
            z: "tab",
            name: "run child",
            targetComponentId: "in02",
            paramSources: {},
            statuz: "",
            statuzType: "str",
            outputs: 2,
            outLabels: ["default", "child separate"],
            wires: [["out01"], ["out01"]]
        },
        {
            id: "out01",
            type: "component_out",
            z: "tab",
            name: "parent return",
            mode: "default",
            wires: []
        },
        {
            id: "in02",
            type: "component_in",
            z: "tab",
            name: "child start",
            api: [],
            wires: [["out02default", "out02separate"]]
        },
        {
            id: "out02default",
            type: "component_out",
            z: "tab",
            name: "child default",
            mode: "default",
            wires: []
        },
        {
            id: "out02separate",
            type: "component_out",
            z: "tab",
            name: "child separate",
            mode: "separate",
            wires: []
        },
        { id: "debug01", type: "helper", z: "tab" }
    ];
}

describe("issue 62 nested separate output merged into single parent return", function () {
    before(function (done) {
        helper.startServer(done);
    });

    after(function (done) {
        helper.stopServer(done);
    });

    afterEach(function () {
        helper.unload();
    });

    it("should keep the parent return connected to exactly one start node and return both child outputs", function (done) {
        helper.load([componentStart, componentReturn, runComponent], createIssue62Flow(), {}, function () {
            var out01 = helper.getNode("out01");
            var debug01 = helper.getNode("debug01");
            var run01 = helper.getNode("run01");
            var seen = 0;

            try {
                should.exist(out01);
                out01.should.have.property("inNodeLength", 1);
                should(out01.invalid).not.equal(true);
            } catch (e) {
                done(e);
                return;
            }

            debug01.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "Works!");
                    seen += 1;
                    if (seen === 2) {
                        done();
                    }
                } catch (e) {
                    done(e);
                }
            });

            run01.receive({ payload: "Works!" });
        });
    });
});