var should = require("should");
var helper = require("node-red-node-test-helper");
var catchNode = require("@node-red/nodes/core/common/25-catch");
var componentStart = require("../component-start.js");
var componentReturn = require("../component-return.js");
var runComponent = require("../run-component.js");

helper.init(require.resolve("node-red"));

function createIssue61Flow() {
    return [
        { id: "tab", type: "tab", label: "Issue 61" },
        {
            id: "in01",
            type: "component_in",
            z: "tab",
            name: "target",
            api: [
                { name: "brokenParam", type: "string", required: false }
            ],
            wires: [["ret01"]]
        },
        {
            id: "ret01",
            type: "component_out",
            z: "tab",
            name: "return",
            mode: "default",
            wires: []
        },
        {
            id: "run01",
            type: "component",
            z: "tab",
            name: "run 01",
            targetComponentId: "in01",
            paramSources: {
                brokenParam: {
                    name: "brokenParam",
                    source: "missing.object",
                    sourceType: "msg"
                }
            },
            statuz: "",
            statuzType: "str",
            outputs: 1,
            outLabels: ["default"],
            wires: [["debug01"]]
        },
        {
            id: "catch01",
            type: "catch",
            z: "tab",
            name: "catch run 01",
            scope: ["run01"],
            uncaught: false,
            wires: [["catchHelper"]]
        },
        { id: "debug01", type: "helper", z: "tab" },
        { id: "catchHelper", type: "helper", z: "tab" }
    ];
}

describe("issue 61 catchable param evaluation", function () {
    before(function (done) {
        helper.startServer(done);
    });

    after(function (done) {
        helper.stopServer(done);
    });

    afterEach(function () {
        helper.unload();
    });

    it("should surface invalid parameter source evaluation via catch node", function (done) {
        helper.load([componentStart, componentReturn, runComponent, catchNode], createIssue61Flow(), {}, function () {
            var run01 = helper.getNode("run01");
            var debug01 = helper.getNode("debug01");
            var catchHelper = helper.getNode("catchHelper");

            debug01.on("input", function () {
                done(new Error("component call should not emit a normal output when parameter evaluation fails"));
            });

            catchHelper.on("input", function (msg) {
                try {
                    should.exist(msg.error);
                    msg.error.should.have.property("message");
                    msg.error.message.should.match(/Cannot read properties of undefined|failed to evaluate|object/);
                    msg.error.should.have.property("source");
                    msg.error.source.should.have.property("id", "run01");
                    done();
                } catch (e) {
                    done(e);
                }
            });

            run01.receive({ payload: "ignored" });
        });
    });
});