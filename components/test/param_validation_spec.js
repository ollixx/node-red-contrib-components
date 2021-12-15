var should = require("should");
var helper = require("node-red-node-test-helper");
var componentStart = require("../component-start.js");
var componentReturn = require("../component-return.js");
var runComponent = require("../run-component.js");

helper.init(require.resolve('node-red'));

var flowValidations = [
    {
        "id": "01",
        "type": "component_in",
        "name": "validations",
        "api": [
            {
                "name": "string",
                "type": "string",
                "required": false,
                "contextOption": false
            },
            {
                "name": "number",
                "type": "number",
                "required": false,
                "contextOption": false
            },
            {
                "name": "json",
                "type": "json",
                "required": false,
                "contextOption": false
            },
            {
                "name": "boolean",
                "type": "boolean",
                "required": false,
                "contextOption": false
            },
            {
                "name": "any",
                "type": "any",
                "required": false,
                "contextOption": false
            },
            {
                "name": "req_string",
                "type": "string",
                "required": true,
                "contextOption": false
            },
            {
                "name": "req_number",
                "type": "number",
                "required": true,
                "contextOption": false
            },
            {
                "name": "req_json",
                "type": "json",
                "required": true,
                "contextOption": false
            },
            {
                "name": "req_boolean",
                "type": "boolean",
                "required": true,
                "contextOption": false
            },
            {
                "name": "req_any",
                "type": "any",
                "required": true,
                "contextOption": false
            }
        ],
        "usecontext": false,
        "wires": [
            [
                "02"
            ]
        ]
    },
    {
        "id": "02",
        "type": "component_out",
        "mode": "default",
        "wires": []
    },
    {
        "id": "03",
        "type": "component",
        "targetComponentId": "01",
        "paramSources": {
            "string": {
                "name": "string",
                "source": "payload",
                "sourceType": "msg"
            },
            "number": {
                "name": "number",
                "source": "payload",
                "sourceType": "msg"
            },
            "json": {
                "name": "json",
                "source": "payload",
                "sourceType": "msg"
            },
            "boolean": {
                "name": "boolean",
                "source": "payload",
                "sourceType": "msg"
            },
            "any": {
                "name": "any",
                "source": "payload",
                "sourceType": "msg"
            },
            "req_string": {
                "name": "req_string",
                "source": "payload",
                "sourceType": "msg"
            },
            "req_number": {
                "name": "req_number",
                "source": "payload",
                "sourceType": "msg"
            },
            "req_json": {
                "name": "req_json",
                "source": "payload",
                "sourceType": "msg"
            },
            "req_boolean": {
                "name": "req_boolean",
                "source": "payload",
                "sourceType": "msg"
            },
            "req_any": {
                "name": "req_any",
                "source": "payload",
                "sourceType": "msg"
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
                "debug"
            ]
        ]
    },
    {
        "id": "04",
        "type": "component",
        "targetComponentId": "01",
        "paramSources": {
            "string": {
                "name": "string",
                "source": "none",
                "sourceType": "msg"
            },
            "number": {
                "name": "number",
                "source": "none",
                "sourceType": "msg"
            },
            "json": {
                "name": "json",
                "source": "none",
                "sourceType": "msg"
            },
            "boolean": {
                "name": "boolean",
                "source": "none",
                "sourceType": "msg"
            },
            "any": {
                "name": "any",
                "source": "none",
                "sourceType": "msg"
            },
            "req_string": {
                "name": "req_string",
                "source": "none",
                "sourceType": "msg"
            },
            "req_number": {
                "name": "req_number",
                "source": "none",
                "sourceType": "msg"
            },
            "req_json": {
                "name": "req_json",
                "source": "none",
                "sourceType": "msg"
            },
            "req_boolean": {
                "name": "req_boolean",
                "source": "none",
                "sourceType": "msg"
            },
            "req_any": {
                "name": "req_any",
                "source": "none",
                "sourceType": "msg"
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
                "debug"
            ]
        ]
    },
    {
        "id": "debug",
        "type": "helper",
    }
]

describe('parameters with wrong type', function () {

    before(function (done) {
        helper.startServer(done);
    });

    after(function (done) {
        helper.stopServer(done);
    });

    afterEach(function () {
        helper.unload();
    });

    it('(string) should add a validation error', function (done) {
        helper.load([componentStart, componentReturn, runComponent], flowValidations, {}, function () {
            var run = helper.getNode("03");
            run.on("input", function (msg) {
                try {
                    let expectedErrors = {
                        validationErrors: {
                            "number": "components.message.validationError",
                            "json": "components.message.jsonValidationError",
                            "boolean": "components.message.validationError",
                            "req_number": "components.message.validationError",
                            "req_json": "components.message.jsonValidationError",
                            "req_boolean": "components.message.validationError"
                        }
                    };
                    run.error.should.be.calledWithExactly(expectedErrors);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            run.receive({
                payload: "test"
            });
        });
    });

    it('(number) should add a validation error', function (done) {
        helper.load([componentStart, componentReturn, runComponent], flowValidations, {}, function () {
            var run = helper.getNode("03");
            run.on("input", function (msg) {
                try {
                    let expectedErrors = {
                        validationErrors: {
                            "string": "components.message.validationError",
                            "boolean": "components.message.validationError",
                            "req_string": "components.message.validationError",
                            "req_boolean": "components.message.validationError"
                        }
                    };
                    run.error.should.be.calledWithExactly(expectedErrors);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            run.receive({
                payload: 42
            });
        });
    });

    it('(boolean) should add a validation error', function (done) {
        helper.load([componentStart, componentReturn, runComponent], flowValidations, {}, function () {
            var run = helper.getNode("03");
            run.on("input", function (msg) {
                try {
                    let expectedErrors = {
                        validationErrors: {
                            "string": "components.message.validationError",
                            "number": "components.message.validationError",
                            "req_string": "components.message.validationError",
                            "req_number": "components.message.validationError",
                        }
                    };
                    run.error.should.be.calledWithExactly(expectedErrors);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            run.receive({
                payload: true
            });
        });
    });

    it('(array) should add a validation error', function (done) {
        helper.load([componentStart, componentReturn, runComponent], flowValidations, {}, function () {
            var run = helper.getNode("03");
            run.on("input", function (msg) {
                try {
                    let expectedErrors = {
                        validationErrors: {
                            "string": "components.message.validationError",
                            "number": "components.message.validationError",
                            "boolean": "components.message.validationError",
                            "req_string": "components.message.validationError",
                            "req_number": "components.message.validationError",
                            "req_boolean": "components.message.validationError"
                        }
                    };
                    run.error.should.be.calledWithExactly(expectedErrors);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            run.receive({
                payload: []
            });
        });
    });

    it('(object) should add a validation error', function (done) {
        helper.load([componentStart, componentReturn, runComponent], flowValidations, {}, function () {
            var run = helper.getNode("03");
            run.on("input", function (msg) {
                try {
                    let expectedErrors = {
                        validationErrors: {
                            "string": "components.message.validationError",
                            "number": "components.message.validationError",
                            "boolean": "components.message.validationError",
                            "req_string": "components.message.validationError",
                            "req_number": "components.message.validationError",
                            "req_boolean": "components.message.validationError"
                        }
                    };
                    run.error.should.be.calledWithExactly(expectedErrors);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            run.receive({
                payload: {}
            });
        });
    });

    it('(json string) should add a validation error', function (done) {
        helper.load([componentStart, componentReturn, runComponent], flowValidations, {}, function () {
            var run = helper.getNode("03");
            run.on("input", function (msg) {
                try {
                    let expectedErrors = {
                        validationErrors: {
                            "number": "components.message.validationError",
                            "boolean": "components.message.validationError",
                            "req_number": "components.message.validationError",
                            "req_boolean": "components.message.validationError"
                        }
                    };
                    run.error.should.be.calledWithExactly(expectedErrors);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            run.receive({
                payload: "\"{answer: 42}\""
            });
        });
    });

    it('(required) should add a validation error', function (done) {
        helper.load([componentStart, componentReturn, runComponent], flowValidations, {}, function () {
            var run = helper.getNode("04");
            run.on("input", function (msg) {
                try {
                    let expectedErrors = {
                        validationErrors: {
                            "req_string": "components.message.missingProperty",
                            "req_number": "components.message.missingProperty",
                            "req_boolean": "components.message.missingProperty",
                            "req_json": "components.message.missingProperty",
                            "req_any": "components.message.missingProperty",
                        }
                    };
                    run.error.should.be.calledWithExactly(expectedErrors);
                    done();
                } catch (e) {
                    done(e);
                }
            });
            run.receive({
                payload: "test"
            });
        });
    });

});