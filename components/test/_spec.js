var should = require("should");
var helper = require("node-red-node-test-helper");
var changeNode = require("@node-red/nodes/core/function/15-change");
var components = require("../components.js");

helper.init(require.resolve('node-red'));

describe('components in Node', function () {

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should basically work', function (done) {
        var flow = [
            { id: "n1", type: "component_in", name: "start component", wires: [["nD"]] },
            { id: "nD", type: "change", name: "", rules: [{ t: "set", p: "payload", pt: "msg", to: "1", tot: "str" }], reg: false, "wires": [["n2"]] },
            { id: "n2", type: "component_out", name: "end component", wires: [] },
            { id: "n3", type: "component", name: "use component", targetComponent: "n1", paramSources: {}, wires: [["nH"]] },
            { id: "nH", type: "helper" }
        ];
        helper.load([components, changeNode], flow, function () {
            var n1 = helper.getNode("n1");
            n1.should.be.not.null;
            n1.should.have.property('name', 'start component');
            var nH = helper.getNode("nH");
            nH.on("input", function (msg) {
                try {
                    msg.should.have.property('payload', '1');
                    done();
                } catch (e) {
                    done(e);
                }
            });
            var n3 = helper.getNode("n3");
            n3.receive({ payload: "2" });
        });
    });

    it('should work with empty optional parameters', function (done) {
        var flow = [
            { 
                id: "n1", 
                type: "component_in", 
                name: "start component", 
                api: [
                    {name: "optional1", type: "string", required: false},
                    {name: "optional2", type: "string", required: false},
                    {name: "optional3", type: "string", required: false},
                    {name: "optional4", type: "string", required: false},
                    {name: "optional5", type: "string", required: false},
                    {name: "optional6", type: "string", required: false},
                    {name: "optional7", type: "string", required: false},
                    {name: "optional8", type: "string", required: false},
                    {name: "optional9", type: "string", required: false},
                    {name: "optional10", type: "string", required: false},
                    {name: "optional11", type: "string", required: false},
                    {name: "optional12", type: "string", required: false},
                    {name: "optional13", type: "string", required: false},
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
                     optional1: {name: "optional1", type: "string", source: "", sourceType: "msg"}
                    ,optional2: {name: "optional2", type: "string", source: "", sourceType: "global"}
                    ,optional3: {name: "optional3", type: "string", source: "", sourceType: "flow"}
                    ,optional4: {name: "optional4", type: "string", source: "", sourceType: "str"}
                    ,optional5: {name: "optional5", type: "string", source: "", sourceType: "num"}
                    ,optional6: {name: "optional6", type: "string", source: "", sourceType: "bool"}
                    ,optional7: {name: "optional7", type: "string", source: "", sourceType: "json"}
                    ,optional8: {name: "optional8", type: "string", source: "", sourceType: "re"}
                    ,optional9: {name: "optional9", type: "string", source: "", sourceType: "date"}
                    ,optional10: {name: "optional10", type: "string", source: "", sourceType: "jsonata"}
                    ,optional11: {name: "optional11", type: "string", source: "", sourceType: "bin"}
                    ,optional12: {name: "optional12", type: "string", source: "", sourceType: "env"}
                    ,optional13: {name: "optional13", type: "string", source: "", sourceType: "node"}
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
                    done();
                } catch (e) {
                    done(e);
                }
            });
            var n3 = helper.getNode("n3");
            n3.receive({ payload: "2" });
        });
    });

});