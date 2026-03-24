var helper = require("node-red-node-test-helper");
var should = require("should");
var componentStart = require("../component-start.js");
var componentReturn = require("../component-return.js");
var runComponent = require("../run-component.js");

helper.init(require.resolve("node-red"));

var flowWithMultipleOutputsOnStart = [
    {
        id: "tab",
        type: "tab"
    },
    {
        id: "in01",
        type: "component_in",
        z: "tab",
        name: "in 01",
        usecontext: true,
        api: [
            { name: "foo", type: "number", required: true, contextOption: true }
        ],
        wires: [["debug01", "debug02"]]
    },
    {
        id: "run01",
        type: "component",
        z: "tab",
        name: "run 01",
        targetComponentId: "in01",
        paramSources: {
            foo: { source: "payload", sourceType: "msg", name: "foo" }
        },
        statuz: "",
        statuzType: "str",
        outputs: 1,
        outLabels: ["default"],
        wires: [[]]
    },
    { id: "debug01", type: "helper", z: "tab" },
    { id: "debug02", type: "helper", z: "tab" }
];

describe("issue 63 regression", function () {

    before(function (done) {
        helper.startServer(done);
    });

    after(function (done) {
        helper.stopServer(done);
    });

    afterEach(function () {
        helper.unload();
    });

    it("should preserve component context for all fan-out receivers on component_in", function (done) {
        helper.load([componentStart, componentReturn, runComponent], flowWithMultipleOutputsOnStart, {}, function () {
            var run01 = helper.getNode("run01");
            var seen = [];
            var timeout = setTimeout(function () {
                done(new Error("timed out waiting for both start outputs"));
            }, 1000);

            function onInput(id, msg) {
                seen.push({
                    id: id,
                    foo: msg.component && msg.component.foo,
                    hasCompState: !!msg._comp,
                    stackLength: msg._comp && msg._comp.stack && msg._comp.stack.length,
                    callerId: msg._comp && msg._comp.stack && msg._comp.stack[0] && msg._comp.stack[0].callerId
                });

                if (seen.length !== 2) {
                    return;
                }

                clearTimeout(timeout);
                seen.sort(function (left, right) {
                    return left.id.localeCompare(right.id);
                });

                try {
                    seen.should.eql([
                        { id: "debug01", foo: 42, hasCompState: true, stackLength: 1, callerId: "run01" },
                        { id: "debug02", foo: 42, hasCompState: true, stackLength: 1, callerId: "run01" }
                    ]);
                    done();
                } catch (err) {
                    done(err);
                }
            }

            helper.getNode("debug01").on("input", function (msg) {
                onInput("debug01", msg);
            });
            helper.getNode("debug02").on("input", function (msg) {
                onInput("debug02", msg);
            });

            run01.receive({ payload: 42 });
        });
    });
});