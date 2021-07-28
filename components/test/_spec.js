var should = require("should");
var helper = require("node-red-node-test-helper");
var changeNode = require("@node-red/nodes/core/function/15-change");
var linkNode = require("@node-red/nodes/core/common/60-link");
var catchNode = require("@node-red/nodes/core/common/25-catch");
var components = require("../components.js");

helper.init(require.resolve('node-red'));

var testFlow = [
    {
        id: "tab",
        type: "tab",
        label: "Test flow"
    },
    {
        id: "run01",
        "type": "component",
        "z": "tab",
        "name": "run 01",
        "targetComponent": {
            "id": "in01",
            "name": "in 01",
            "api": [
                {
                    "name": "name1",
                    "type": "string",
                    "required": true
                },
                {
                    "name": "Das ist ein längerer",
                    "type": "json",
                    "required": true
                }
            ]
        },
        "paramSources": {
            "name1": {
                "name": "name1",
                "type": "string",
                "required": true,
                "source": "\"Test\"",
                "sourceType": "jsonata"
            },
            "Das ist ein längerer": {
                "name": "Das ist ein längerer",
                "type": "json",
                "required": true,
                "source": "payload.inner[\"even more\"]",
                "sourceType": "msg"
            }
        },
        "statuz": "name1",
        "statuzType": "msg",
        "outputs": 2,
        "outLabels": [
            "default",
            "ret 01b"
        ],
        "wires": [
            [
                "debug01"
            ],
            [
                "debug02"
            ]
        ]
    },
    {
        "id": "in01",
        "type": "component_in",
        "z": "tab",
        "name": "in 01",
        "api": [
            {
                "name": "name1",
                "type": "string",
                "required": true
            },
            {
                "name": "Das ist ein längerer",
                "type": "json",
                "required": true
            }
        ],
        "wires": [
            [
                "change01"
            ]
        ]
    },
    {
        "id": "change01",
        "type": "change",
        "z": "tab",
        "name": "",
        "rules": [
            {
                "t": "set",
                "p": "outer",
                "pt": "msg",
                "to": "{\"test\": 42}",
                "tot": "json"
            }
        ],
        "action": "",
        "property": "",
        "from": "",
        "to": "",
        "reg": false,
        "x": 320,
        "y": 320,
        "wires": [
            [
                "run02",
                "out01b"
            ]
        ]
    },
    {
        "id": "run02",
        "type": "component",
        "z": "tab",
        "name": "run 02",
        "targetComponent": {
            "id": "in02",
            "name": "out 02",
            "api": []
        },
        "paramSources": {},
        "statuz": "",
        "statuzType": "str",
        "outputs": 1,
        "outLabels": [
            "ret 02"
        ],
        "x": 510,
        "y": 320,
        "wires": [
            [
                "out01a"
            ]
        ]
    },
    {
        "id": "out01a",
        "type": "component_out",
        "z": "tab",
        "name": "ret 01a",
        "mode": "default",
        "x": 670,
        "y": 320,
        "wires": []
    },
    {
        "id": "out01b",
        "type": "component_out",
        "z": "tab",
        "name": "ret 01b",
        "mode": "separate",
        "x": 520,
        "y": 360,
        "wires": []
    },
    {
        "id": "in02",
        "type": "component_in",
        "z": "tab",
        "name": "in 02",
        "api": [],
        "x": 150,
        "y": 440,
        "wires": [
            [
                "change02"
            ]
        ]
    },
    {
        "id": "change02",
        "type": "change",
        "z": "tab",
        "name": "",
        "rules": [
            {
                "t": "set",
                "p": "inner",
                "pt": "msg",
                "to": "23",
                "tot": "num"
            }
        ],
        "action": "",
        "property": "",
        "from": "",
        "to": "",
        "reg": false,
        "x": 320,
        "y": 440,
        "wires": [
            [
                "linkOut01"
            ]
        ]
    },
    {
        "id": "linkOut01",
        "type": "link out",
        "z": "tab",
        "name": "link out 01",
        "links": [
            "linkIn01"
        ],
        "x": 435,
        "y": 440,
        "wires": []
    },
    {
        "id": "linkIn01",
        "type": "link in",
        "z": "tab",
        "name": "link in 01",
        "links": [
            "linkOut01"
        ],
        "x": 535,
        "y": 440,
        "wires": [
            [
                "out02"
            ]
        ]
    },
    {
        "id": "out02",
        "type": "component_out",
        "z": "tab",
        "name": "ret 02",
        "mode": "separate",
        "x": 630,
        "y": 440,
        "wires": []
    },
    { id: "debug01", type: "helper" },
    { id: "debug02", type: "helper" }
]

describe('components embedded flow', function () {

    before(function (done) {
        helper.startServer(done);
    });

    after(function (done) {
        helper.stopServer(done);
    });

    afterEach(function () {
        helper.unload();
    });

    it('should basically work', function (done) {
        helper.load([components, changeNode, linkNode, catchNode], testFlow, {}, function () {
            /*
            var in01 = helper.getNode("in01");
            in01.on("input", function(msg) {
                console.log("in01")
            })

            var run01 = helper.getNode("run01");
            run01.on("input", function(msg) {
                console.log("run01")
            })
            */

            var debug01 = helper.getNode("debug01");
            debug01.on("input", function (msg) {
                try {
                    msg.should.have.property("inner")
                } catch (e) {
                    done(e);
                }
            });
            var debug02 = helper.getNode("debug02");
            debug02.on("input", function (msg) {
                try {
                    msg.should.have.property("outer")
                    done();
                } catch (e) {
                    done(e);
                }
            });
            var run01 = helper.getNode("run01");
            run01.receive({ 
                payload: {
                    inner: {
                        "even more": 999
                    }
                } 
            });

            //var n3 = helper.getNode("n3");
            // n3.receive({ payload: "2" });

            // debug01.receive({ payload: "2" })
        });
    });

    /*
    it('should work with empty optional parameters', function (done) {
        var flow = [
            {
                id: "n1",
                type: "component_in",
                name: "start component",
                api: [
                    { name: "optional1", type: "string", required: false },
                    { name: "optional2", type: "string", required: false },
                    { name: "optional3", type: "string", required: false },
                    { name: "optional4", type: "string", required: false },
                    { name: "optional5", type: "string", required: false },
                    { name: "optional6", type: "string", required: false },
                    { name: "optional7", type: "string", required: false },
                    { name: "optional8", type: "string", required: false },
                    { name: "optional9", type: "string", required: false },
                    { name: "optional10", type: "string", required: false },
                    { name: "optional11", type: "string", required: false },
                    { name: "optional12", type: "string", required: false },
                    { name: "optional13", type: "string", required: false },
                ],
                wires: [["n2"]]
            },
            { id: "n2", type: "component_out", name: "end component", wires: [] },
            {
                id: "n3",
                type: "component",
                name: "use component",
                targetComponent: "n1",
                paramSources: {
                    optional1: { name: "optional1", type: "string", source: "", sourceType: "msg" }
                    , optional2: { name: "optional2", type: "string", source: "", sourceType: "global" }
                    , optional3: { name: "optional3", type: "string", source: "", sourceType: "flow" }
                    , optional4: { name: "optional4", type: "string", source: "", sourceType: "str" }
                    , optional5: { name: "optional5", type: "string", source: "", sourceType: "num" }
                    , optional6: { name: "optional6", type: "string", source: "", sourceType: "bool" }
                    , optional7: { name: "optional7", type: "string", source: "", sourceType: "json" }
                    , optional8: { name: "optional8", type: "string", source: "", sourceType: "re" }
                    , optional9: { name: "optional9", type: "string", source: "", sourceType: "date" }
                    , optional10: { name: "optional10", type: "string", source: "", sourceType: "jsonata" }
                    , optional11: { name: "optional11", type: "string", source: "", sourceType: "bin" }
                    , optional12: { name: "optional12", type: "string", source: "", sourceType: "env" }
                    , optional13: { name: "optional13", type: "string", source: "", sourceType: "node" }
                },
                wires: [["nH"]]
            },
            { id: "nH", type: "helper" }
        ];
        helper.load([components, changeNode], flow, function () {
            var n1 = helper.getNode("n1");
            n1.should.be.not.null;
            n1.should.have.property('name', 'start component');
            var nH = helper.getNode("nH");
            nH.on("input", function (msg) {
                try {
                    msg.should.not.have.property('optional1');
                    msg.should.not.have.property('optional2');
                    msg.should.not.have.property('optional3');
                    msg.should.have.property('optional4');
                    msg.should.not.have.property('optional5');
                    msg.should.not.have.property('optional6');
                    msg.should.not.have.property('optional7');
                    msg.should.not.have.property('optional8');
                    msg.should.not.have.property('optional9');
                    msg.should.not.have.property('optional10');
                    msg.should.not.have.property('optional11');
                    msg.should.not.have.property('optional12');
                    msg.should.not.have.property('optional13');
                    done();
                } catch (e) {
                    done(e);
                }
            });
            var n3 = helper.getNode("n3");
            n3.receive({ payload: "2" });
        });
    });
 
    it('should work with empty required parameters', function (done) {
        var flow = [
            {
                id: "n1",
                type: "component_in",
                name: "start component",
                api: [
                    { name: "required1", type: "string", required: true },
                    { name: "required2", type: "string", required: true },
                    { name: "required3", type: "string", required: true },
                    { name: "required4", type: "string", required: true },
                    { name: "required5", type: "string", required: true },
                    { name: "required6", type: "string", required: true },
                    { name: "required7", type: "string", required: true },
                    { name: "required8", type: "string", required: true },
                    { name: "required9", type: "string", required: true },
                    { name: "required10", type: "string", required: true },
                    { name: "required11", type: "string", required: true },
                    { name: "required12", type: "string", required: true },
                    { name: "required13", type: "string", required: true }
                ],
                wires: [["n2"]]
            },
            { id: "n2", type: "component_out", name: "end component", wires: [] },
            {
                id: "n3",
                type: "component",
                name: "use component",
                targetComponent: "n1",
                paramSources: {
                    required1: { name: "required1", type: "string", source: "", sourceType: "msg", required: true }
                    , required2: { name: "required2", type: "string", source: "", sourceType: "global", required: true }
                    , required3: { name: "required3", type: "string", source: "", sourceType: "flow", required: true }
                    , required4: { name: "required4", type: "string", source: "", sourceType: "str", required: true }
                    , required5: { name: "required5", type: "string", source: "", sourceType: "num", required: true }
                    , required6: { name: "required6", type: "string", source: "", sourceType: "bool", required: true }
                    , required7: { name: "required7", type: "string", source: "", sourceType: "json", required: true }
                    , required8: { name: "required8", type: "string", source: "", sourceType: "re", required: true }
                    , required9: { name: "required9", type: "string", source: "", sourceType: "date", required: true }
                    , required10: { name: "required10", type: "string", source: "", sourceType: "jsonata", required: true }
                    , required11: { name: "required11", type: "string", source: "", sourceType: "bin", required: true }
                    , required12: { name: "required12", type: "string", source: "", sourceType: "env", required: true }
                    , required13: { name: "required13", type: "string", source: "", sourceType: "node", required: true }
                },
                wires: [["nH"]]
            },
            { id: "nH", type: "helper" }
        ];
        try {
            helper.load([components], flow, function () {
                var nH = helper.getNode("nH");
                nH.on("input", function (msg) {
                    console.log("hier", msg);
                    try {
                        msg.should.be.a.Error();
                        done();
                    } catch (e) {
                        done(e);
                    }
                });
                var n3 = helper.getNode("n3");
                n3.receive({ payload: "2" });
            });
        } catch (err) {
            console.log(err);
            done(err);
        }
    });
    */

});