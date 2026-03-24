var should = require("should");
var helper = require("node-red-node-test-helper");
var componentStart = require("../component-start.js");
var componentReturn = require("../component-return.js");
var runComponent = require("../run-component.js");

helper.init(require.resolve("node-red"));

var flowWithJsonataStatus = [
    {
        id: "in01",
        type: "component_in",
        name: "in 01",
        api: [],
        wires: [["ret01"]]
    },
    {
        id: "ret01",
        type: "component_out",
        name: "ret 01",
        mode: "default",
        wires: []
    },
    {
        id: "run01",
        type: "component",
        name: "run 01",
        targetComponentId: "in01",
        paramSources: {},
        statuz: '$string(payload)',
        statuzType: "jsonata",
        outputs: 1,
        outLabels: ["default"],
        wires: [["debug01"]]
    },
    { id: "debug01", type: "helper" }
];

var flowWithMissingTarget = [
    {
        id: "run01",
        type: "component",
        name: "run missing",
        targetComponentId: "missing-node",
        paramSources: {},
        statuz: "",
        statuzType: "str",
        outputs: 1,
        outLabels: ["default"],
        wires: [["debug01"]]
    },
    { id: "debug01", type: "helper" }
];

describe("runtime regressions", function () {

    before(function (done) {
        helper.startServer(done);
    });

    after(function (done) {
        helper.stopServer(done);
    });

    afterEach(function () {
        helper.unload();
    });

    it("should evaluate JSONata status expressions via statuzType", function (done) {
        helper.load([componentStart, componentReturn, runComponent], flowWithJsonataStatus, {}, function () {
            var run01 = helper.getNode("run01");
            var debug01 = helper.getNode("debug01");

            debug01.on("input", function (msg) {
                setImmediate(function () {
                    try {
                        msg.should.have.property("payload", "done");
                        run01.status.should.be.calledWithMatch({ text: "done" });
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
            });

            run01.receive({ payload: "done" });
        });
    });

    it("should report runtime lookup failures as Error objects", function (done) {
        helper.load([componentStart, componentReturn, runComponent], flowWithMissingTarget, {}, function () {
            var run01 = helper.getNode("run01");

            run01.receive({ payload: "Works!" });

            setImmediate(function () {
                try {
                    run01.error.should.be.called();
                    var errorArgs = run01.error.getCall(run01.error.callCount - 1).args;
                    should(errorArgs[0]).be.instanceOf(Error);
                    errorArgs[0].message.should.match(/could not find node for id: missing-node/);
                    errorArgs[1].should.have.property("payload", "Works!");
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});