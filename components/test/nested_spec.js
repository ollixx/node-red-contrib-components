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
        "wires": []
    },
    {
        "id": "out01b",
        "type": "component_out",
        "z": "tab",
        "name": "ret 01b",
        "mode": "separate",
        "wires": []
    },
    {
        "id": "in02",
        "type": "component_in",
        "z": "tab",
        "name": "in 02",
        "api": [],
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
        "x": 435,
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
        "wires": []
    },
    { id: "debug01", type: "helper" },
    { id: "debug02", type: "helper" }
]

describe('nested components, connected by links', function () {

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
        });
    });
});