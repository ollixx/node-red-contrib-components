var should = require("should");
var helper = require("node-red-node-test-helper");
var components = require("../components.js");

helper.init(require.resolve('node-red'));

var testFlow = [
    {
        "id": "c58cbb4f.4a7a98",
        "type": "component_in",
        "name": "Component 4",
        "api": [],
        "wires": [
            [
                "6b50b048.8fd3e",
                "30c7b937.ca1356",
                "3ba50700.4d49fa",
                "13436b52.301765"
            ]
        ]
    },
    {
        "id": "run01",
        "type": "component",
        "name": "run 04",
        "targetComponent": {
            "id": "c58cbb4f.4a7a98",
            "name": "Component 4",
            "api": []
        },
        "paramSources": {},
        "statuz": "",
        "statuzType": "str",
        "outputs": 3,
        "outLabels": [
            "default",
            "ret 04.3",
            "ret 04.4"
        ],
        "wires": [
            [
                "debug01"
            ],
            [
                "debug02"
            ],
            [
                "debug03"
            ]
        ]
    },
    {
        "id": "6b50b048.8fd3e",
        "type": "component_out",
        "name": "ret 04.1",
        "mode": "default",
        "wires": []
    },
    {
        "id": "30c7b937.ca1356",
        "type": "component_out",
        "name": "ret 04.2",
        "mode": "default",
        "wires": []
    },
    {
        "id": "3ba50700.4d49fa",
        "type": "component_out",
        "name": "ret 04.3",
        "mode": "separate",
        "wires": []
    },
    {
        "id": "13436b52.301765",
        "type": "component_out",
        "name": "ret 04.4",
        "mode": "separate",
        "wires": []
    },
    { id: "debug01", type: "helper" },
    { id: "debug02", type: "helper" },
    { id: "debug03", type: "helper" },
    { id: "debug04", type: "helper" },
]

describe('multiple return nodes', function () {

    before(function (done) {
        helper.startServer(done);
    });

    after(function (done) {
        helper.stopServer(done);
    });

    afterEach(function () {
        helper.unload();
    });

    describe('with mixed modes', function () {

        it('should send messages to the correct ports', function (done) {
            helper.load([components], testFlow, {}, function () {

                var count01 = 0;

                var debug01 = helper.getNode("debug01");
                debug01.on("input", function (msg) {
                    try {
                        msg.should.have.property("payload", "Works!")
                        count01++
                        if (count01 == 1) {
                            done()
                        }
                    } catch (e) {
                        done(e);
                    }
                });
                var debug02 = helper.getNode("debug02");
                debug02.on("input", function (msg) {
                    msg.should.have.property("payload", "Works!")
                    //console.log("debug 02", count02++, msg)
                });
                var debug03 = helper.getNode("debug03");
                debug03.on("input", function (msg) {
                    console.log("debug 03", count03++, msg)
                });

                var run01 = helper.getNode("run01");
                run01.receive({
                    payload: "Works!"
                });


            });
        });
    });

    describe('all set to default', function () {

        before(function (done) {
            testFlow.forEach((node) => {
                if (node.name == "ret 04.3" || node.name == "ret 04.4") {
                    node.mode = "default";
                }
            })
            done()
        });
    
        it('should send messages to only the default ports', function (done) {
            helper.load([components], testFlow, {}, function () {

                var count01 = 0;

                var debug01 = helper.getNode("debug01");
                debug01.on("input", function (msg) {
                    try {
                        msg.should.have.property("payload", "Works!")
                        count01++
                        if (count01 == 3) {
                            done()
                        }
                    } catch (e) {
                        done(e);
                    }
                });
                var debug02 = helper.getNode("debug02");
                debug02.on("input", function (msg) {
                    done(new Error("should not succeed"));
                });
                var debug03 = helper.getNode("debug03");
                debug03.on("input", function (msg) {
                    done(new Error("should not succeed"));
                });

                var run01 = helper.getNode("run01");
                run01.receive({
                    payload: "Works!"
                });


            });
        });
    });

    describe('all set to separate', function () {

        before(function (done) {
            testFlow.forEach((node) => {
                switch (node.name) {
                    case "ret 04.1":
                    case "ret 04.2":
                    case "ret 04.3":
                    case "ret 04.4": {
                        node.mode = "separate";
                    }
                    case "run 04": {
                        node.outputs = 4;
                        node.outLabels = [
                            "ret 04.1",
                            "ret 04.2",
                            "ret 04.3",
                            "ret 04.4"
                        ];
                        node.wires = [
                            [
                                "debug01"
                            ],
                            [
                                "debug02"
                            ],
                            [
                                "debug03"
                            ],
                            [
                                "debug04"
                            ]
                        ]
                
                    }
                }
            })
            done()
        });
    
        it('should send messages to the matching ports', function (done) {
            helper.load([components], testFlow, {}, function () {

                var debug01 = helper.getNode("debug01");
                debug01.on("input", function (msg) {
                    try {
                        msg.should.have.property("payload", "Works!")
                    } catch (e) {
                        done(e);
                    }
                });
                var debug02 = helper.getNode("debug02");
                debug02.on("input", function (msg) {
                    try {
                        msg.should.have.property("payload", "Works!")
                    } catch (e) {
                        done(e);
                    }
                });
                var debug03 = helper.getNode("debug03");
                debug03.on("input", function (msg) {
                    try {
                        msg.should.have.property("payload", "Works!")
                    } catch (e) {
                        done(e);
                    }
                });
                var debug04 = helper.getNode("debug04");
                debug04.on("input", function (msg) {
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
});
