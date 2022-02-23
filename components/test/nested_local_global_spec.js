var should = require("should");
var helper = require("node-red-node-test-helper");
var changeNode = require("@node-red/nodes/core/function/15-change");
var componentStart = require("../component-start.js");
var componentReturn = require("../component-return.js");
var runComponent = require("../run-component.js");

helper.init(require.resolve('node-red'));

const testFlow1 = [
    {
        "id": "tab",
        "type": "tab"
    },
    {
        "id": "IN outer local",
        "type": "component_in",
        "z": "tab",
        "name": "outer local",
        "api": [
            {
                "name": "prop",
                "type": "json",
                "required": false,
                "contextOption": true
            }
        ],
        "usecontext": true,
        "wires": [
            [
                "change 2",
                "after IN outer local"
            ]
        ]
    },
    {
        "id": "IN inner global",
        "type": "component_in",
        "z": "tab",
        "name": "inner global",
        "api": [
            {
                "name": "prop",
                "type": "json",
                "required": true,
                "contextOption": true
            }
        ],
        "usecontext": false,
        "wires": [
            [
                "change 01"
            ]
        ]
    },
    {
        "id": "OUT 01",
        "type": "component_out",
        "z": "tab",
        "name": null,
        "mode": "default",
        "component_definitions_are_NOT_allowed_inside_subflows": false,
        "wires": []
    },
    {
        "id": "OUT 02",
        "type": "component_out",
        "z": "tab",
        "name": null,
        "mode": "default",
        "component_definitions_are_NOT_allowed_inside_subflows": false,
        "wires": []
    },
    {
        "id": "RUN inner global",
        "type": "component",
        "z": "tab",
        "name": "",
        "targetComponent": null,
        "targetComponentId": "IN inner global",
        "paramSources": {
            "prop": {
                "name": "prop",
                "source": "{\"Outer\": \"string\"}",
                "sourceType": "json"
            }
        },
        "statuz": "",
        "statuzType": "str",
        "outputs": 1,
        "outLabels": [
            "default"
        ],
        "wires": [
            [
                "OUT 01",
                "after RUN inner global"
            ]
        ]
    },
    {
        "id": "change 01",
        "type": "change",
        "z": "tab",
        "name": "",
        "rules": [
            {
                "t": "set",
                "p": "inner",
                "pt": "msg",
                "to": "42",
                "tot": "num"
            },
            {
                "t": "set",
                "p": "component.prop.test",
                "pt": "msg",
                "to": "101",
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
                "after change 01",
                "RUN deep local"
            ]
        ]
    },
    {
        "id": "RUN outer local",
        "type": "component",
        "z": "tab",
        "name": "outer local",
        "targetComponent": null,
        "targetComponentId": "IN outer local",
        "paramSources": {
            "prop": {
                "name": "prop",
                "source": "{}",
                "sourceType": "json"
            }
        },
        "statuz": "",
        "statuzType": "str",
        "outputs": 1,
        "outLabels": [
            "default"
        ],
        "wires": [
            [
                "after RUN outer local"
            ]
        ]
    },
    {
        "id": "after change 01",
        "type": "helper",
        "z": "tab",
    },
    {
        "id": "after RUN inner global",
        "type": "helper",
        "z": "tab",
    },
    {
        "id": "after RUN outer local",
        "type": "helper",
        "z": "tab",
    },
    {
        "id": "IN deep local",
        "type": "component_in",
        "z": "tab",
        "name": "deep local",
        "api": [
            {
                "name": "propDeep",
                "type": "string",
                "required": false,
                "contextOption": true
            }
        ],
        "usecontext": true,
        "wires": [
            [
                "OUT 03",
                "after IN deep local"
            ]
        ]
    },
    {
        "id": "OUT 03",
        "type": "component_out",
        "z": "tab",
        "name": null,
        "mode": "default",
        "component_definitions_are_NOT_allowed_inside_subflows": false,
        "wires": []
    },
    {
        "id": "after IN deep local",
        "type": "helper",
        "z": "tab",
    },
    {
        "id": "RUN deep local",
        "type": "component",
        "z": "tab",
        "name": "",
        "targetComponent": null,
        "targetComponentId": "IN deep local",
        "paramSources": {
            "propDeep": {
                "name": "propDeep",
                "source": "Moin",
                "sourceType": "str"
            }
        },
        "statuz": "",
        "statuzType": "str",
        "outputs": 1,
        "outLabels": [
            "default"
        ],
        "wires": [
            [
                "OUT 02",
                "after RUN deep local"
            ]
        ]
    },
    {
        "id": "after RUN deep local",
        "type": "helper",
        "z": "tab",
    },
    {
        "id": "change 2",
        "type": "change",
        "z": "tab",
        "name": "",
        "rules": [
            {
                "t": "set",
                "p": "component.prop.test",
                "pt": "msg",
                "to": "099",
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
                "RUN inner global"
            ]
        ]
    },
    {
        "id": "after IN outer local",
        "type": "helper",
        "z": "tab",
    }
]


describe('nested components global and local', function () {

    before(function (done) {
        helper.startServer(done);
    });

    after(function (done) {
        helper.stopServer(done);
    });

    afterEach(function () {
        helper.unload();
    });

    it.only('should basically work', function (done) {
        helper.load([componentStart, componentReturn, runComponent, changeNode], testFlow1, {}, function () {
            var debug01 = helper.getNode("after RUN outer local");
            debug01.on("input", function (msg) {
                try {
                    msg.should.have.property("prop").which.has.property("Outer").which.equals("string");
                    msg.should.have.property("inner").which.equals(42);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            var debug02 = helper.getNode("after IN outer local");
            debug02.on("input", function (msg) {
                try {
                    msg.should.have.property("component").which.eql({ prop: {} });
                } catch (e) {
                    done(e);
                }
            });
            var debug03 = helper.getNode("after change 01");
            debug03.on("input", function (msg) {
                try {
                    msg.should.have.property("component").which.eql({ prop: { test: 101 } });
                    msg.should.have.property("inner").which.eql(42);
                } catch (e) {
                    done(e);
                }
            });
            var debug04 = helper.getNode("after IN deep local");
            debug04.on("input", function (msg) {
                try {
                    msg.should.have.property("component").which.eql({ propDeep: "Moin", _parent: { prop: { test: 101 } } });
                    msg.should.have.property("prop").which.eql({ Outer: "string" });
                    msg.should.have.property("inner").which.eql(42);
                } catch (e) {
                    done(e);
                }
            });
            var debug05 = helper.getNode("after RUN deep local");
            debug05.on("input", function (msg) {
                try {
                    msg.should.have.property("component").which.eql({ prop: { test: 101 } });
                    msg.should.have.property("prop").which.eql({ Outer: "string" });
                    msg.should.have.property("inner").which.eql(42);
                } catch (e) {
                    done(e);
                }
            });
            var debug06 = helper.getNode("after RUN inner global");
            debug06.on("input", function (msg) {
                try {
                    msg.should.have.property("component").which.eql({ prop: { test: 101 } });
                    msg.should.have.property("prop").which.eql({ Outer: "string" });
                    msg.should.have.property("inner").which.eql(42);
                } catch (e) {
                    done(e);
                }
            });
            var run = helper.getNode("RUN outer local");
            run.receive({
                payload: {
                    "data": true
                }
            });
        });
    });
});