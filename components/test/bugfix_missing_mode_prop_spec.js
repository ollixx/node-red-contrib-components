var should = require("should");
var helper = require("node-red-node-test-helper");
var componentStart = require("../component-start.js");
var componentReturn = require("../component-return.js");
var runComponent = require("../run-component.js");
const { startServer } = require("node-red-node-test-helper");

helper.init(require.resolve('node-red'));

var testFlow = [
    {
        id: "run01",
        "type": "component",
        "name": "run 01",
        "targetComponent": {
            "id": "in01",
            "name": "in 01",
        },
        "paramSources": {},
        "statuz": "",
        "statuzType": "str",
        "outputs": 1,
        "outLabels": [
            "default"
        ],
        "wires": [
            [
                "debug01"
            ]
        ]
    },
    {
        "id": "in01",
        "type": "component_in",
        "name": "in 01",
        "api": [],
        "wires": [
            [
                "ret01"
            ]
        ]
    },
    {
        "id": "ret01",
        "type": "component_out",
        "name": "ret 01a",
        "mode": undefined,
        "wires": []
    },
    { id: "debug01", type: "helper" }
]

describe('legacy return nodes with mode prop undefined', function () {

    before(function (done) {
        helper.startServer(done);
    });

    after(function (done) {
        helper.stopServer(done);
    });

    afterEach(function () {
        helper.unload();
    });

    it('should return messages', function (done) {
        helper.load([componentStart, componentReturn, runComponent], testFlow, {}, function () {
            var debug01 = helper.getNode("debug01");
            debug01.on("input", function (msg) {
                try {
                    msg.should.have.property("payload", "Works!")
                    done();
                } catch (e) {
                    done(e);
                }
            });
            var run01 = helper.getNode("run01");
            run01.receive({
                payload: "Works!"
            });
        });
    });
});