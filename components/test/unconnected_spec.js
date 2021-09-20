var should = require("should");
var helper = require("node-red-node-test-helper");
var components = require("../components.js");

helper.init(require.resolve('node-red'));

var flowWithUnconnectedInNode = [
    {
        "id": "out01",
        "type": "component_out",
        "name": "ret 01",
        "mode": "separate",
        "wires": []
    },
    {
        "id": "run01",
        "type": "component",
        "z": "tab",
        "name": "run 01",
        "paramSources": {},
        "statuz": "",
        "statuzType": "str",
        "outputs": 1,
        "outLabels": [
            "default"
        ],
        "wires": [
            []
        ]
    },
]

describe('unconnected ', function () {

    before(function (done) {
        helper.startServer(done);
    });

    after(function (done) {
        helper.stopServer(done);
    });

    afterEach(function () {
        helper.unload();
    });

    it('out nodes should throw an error', function (done) {
        helper.load([components], flowWithUnconnectedInNode, {}, function () {
            const out01 = helper.getNode('out01')
            out01.error.should.be.called()

            out01.on('input', () => {
                out01.error.should.be.called()
                done();
            });
            out01.receive({test: true});
        });
    });

    it('run nodes should throw an error', function (done) {
        helper.load([components], flowWithUnconnectedInNode, {}, function () {
            const run01 = helper.getNode('run01')
            run01.error.should.be.called()

            run01.on('input', () => {
                run01.error.should.be.called()
                done();
            });
            run01.receive({test: true});
        });
    });
});