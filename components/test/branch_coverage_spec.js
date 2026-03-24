var should = require("should");
var helper = require("node-red-node-test-helper");
var componentsEmitter = require("../emitter");
var componentStart = require("../component-start.js");
var componentReturn = require("../component-return.js");
var runComponent = require("../run-component.js");

helper.init(require.resolve("node-red"));

function createInOnlyFlow() {
    return [
        { id: "tab", type: "tab" },
        { id: "run01", type: "component", z: "tab", name: "run 01", targetComponentId: "in01", paramSources: {}, statuz: "", statuzType: "str", outputs: 1, outLabels: ["default"], wires: [["debug01"]] },
        { id: "in01", type: "component_in", z: "tab", name: "in 01", api: [], wires: [["inside01"]] },
        { id: "inside01", type: "helper", z: "tab" },
        { id: "debug01", type: "helper", z: "tab" }
    ];
}

function createBroadcastFlow() {
    return [
        { id: "tab", type: "tab" },
        { id: "in01", type: "component_in", z: "tab", name: "in 01", api: [], wires: [["ret01"]] },
        { id: "ret01", type: "component_out", z: "tab", name: "ret 01", mode: "default", wires: [] },
        { id: "run01", type: "component", z: "tab", name: "run 01", targetComponentId: "in01", paramSources: {}, statuz: "", statuzType: "str", outputs: 1, outLabels: ["default"], wires: [["debug01"]] },
        { id: "run02", type: "component", z: "tab", name: "run 02", targetComponent: { id: "in01", name: "in 01", api: [] }, paramSources: {}, statuz: "", statuzType: "str", outputs: 1, outLabels: ["default"], wires: [["debug02"]] },
        { id: "debug01", type: "helper", z: "tab" },
        { id: "debug02", type: "helper", z: "tab" }
    ];
}

function createApiDriftFlow() {
    return [
        { id: "tab", type: "tab" },
        { id: "in01", type: "component_in", z: "tab", name: "in 01", api: [{ name: "requiredParam", type: "string", required: true }], wires: [["ret01"]] },
        { id: "ret01", type: "component_out", z: "tab", name: "ret 01", mode: "default", wires: [] },
        { id: "run01", type: "component", z: "tab", name: "run 01", targetComponentId: "in01", paramSources: {}, statuz: "", statuzType: "str", outputs: 1, outLabels: ["default"], wires: [["debug01"]] },
        { id: "debug01", type: "helper", z: "tab" }
    ];
}

function createInvalidStackFlow() {
    return [
        { id: "tab", type: "tab" },
        { id: "run01", type: "component", z: "tab", name: "run 01", targetComponentId: "in01", paramSources: {}, statuz: "", statuzType: "str", outputs: 1, outLabels: ["default"], wires: [["debug01"]] },
        { id: "in01", type: "component_in", z: "tab", name: "in 01", api: [], wires: [["ret01"]] },
        { id: "ret01", type: "component_out", z: "tab", name: "ret 01", mode: "default", wires: [] },
        { id: "debug01", type: "helper", z: "tab" }
    ];
}

describe("branch coverage scenarios", function () {
    before(function (done) {
        helper.startServer(done);
    });

    after(function (done) {
        helper.stopServer(done);
    });

    afterEach(function () {
        helper.unload();
        componentsEmitter.removeAllListeners();
    });

    it("should return immediately when a component has no return node", function (done) {
        helper.load([componentStart, componentReturn, runComponent], createInOnlyFlow(), {}, function () {
            var inside01 = helper.getNode("inside01");
            var debug01 = helper.getNode("debug01");
            var insideSeen = false;

            inside01.on("input", function (msg) {
                insideSeen = true;
                msg.should.have.property("payload", "Works!");
            });

            debug01.on("input", function (msg) {
                try {
                    insideSeen.should.equal(true);
                    msg.should.have.property("payload", "Works!");
                    should(msg._comp).equal(undefined);
                    done();
                } catch (e) {
                    done(e);
                }
            });

            helper.getNode("run01").receive({ payload: "Works!" });
        });
    });

    it("should broadcast return messages to all matching callers including legacy targets", function (done) {
        helper.load([componentStart, componentReturn, runComponent], createBroadcastFlow(), {}, function () {
            var debug01 = helper.getNode("debug01");
            var debug02 = helper.getNode("debug02");
            var run02 = helper.getNode("run02");
            var seen = [];

            run02.targetComponent = { id: "in01" };
            run02.targetComponentId = undefined;

            function maybeDone() {
                if (seen.length === 2) {
                    seen.sort().should.eql(["debug01", "debug02"]);
                    done();
                }
            }

            debug01.on("input", function (msg) {
                msg.should.have.property("payload", "broadcast");
                seen.push("debug01");
                maybeDone();
            });

            debug02.on("input", function (msg) {
                msg.should.have.property("payload", "broadcast");
                seen.push("debug02");
                maybeDone();
            });

            helper.getNode("ret01").receive({ payload: "broadcast" });
        });
    });

    it("should reject missing parameter sources after an API change", function (done) {
        helper.load([componentStart, componentReturn, runComponent], createApiDriftFlow(), {}, function () {
            var run01 = helper.getNode("run01");
            var debug01 = helper.getNode("debug01");

            debug01.on("input", function () {
                done(new Error("should not emit a message when required sources are missing"));
            });

            run01.receive({ payload: "ignored" });

            setImmediate(function () {
                try {
                    run01.error.should.be.calledWithExactly({
                        validationErrors: {
                            requiredParam: "missing source. please set the parameter to a valid input"
                        }
                    });
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    it("should reject return events with an invalid stack", function (done) {
        helper.load([componentStart, componentReturn, runComponent], createInvalidStackFlow(), {}, function () {
            var run01 = helper.getNode("run01");

            componentsEmitter.emit("comp-flow-return-run01", {
                _comp: { stack: [] },
                payload: "bad"
            });

            setImmediate(function () {
                try {
                    run01.error.should.be.calledWithExactly("components.message.invalid_stack", {
                        _comp: { stack: [] },
                        payload: "bad"
                    });
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});