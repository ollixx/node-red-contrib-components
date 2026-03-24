var should = require("should");
var protocol = require("../lib/comp-protocol");

describe("component protocol helpers", function () {
    it("should initialize and manipulate component state", function () {
        var msg = {};

        protocol.ensureComponentState(msg).should.eql({ stack: [] });
        protocol.setTarget(msg, "in01");
        msg._comp.target.should.equal("in01");

        var entry = protocol.createStackEntry("run01", "in01", { local: true });
        protocol.pushStackEntry(msg, entry);
        protocol.hasValidStack(msg).should.equal(true);
        protocol.peekStackEntry(msg).should.equal(entry);

        protocol.setReturnNode(msg, { id: "ret01", mode: "default" });
        msg._comp.returnNode.should.have.property("id", "ret01");

        protocol.clearReturnNode(msg);
        should(msg._comp.returnNode).equal(undefined);

        protocol.popStackEntry(msg).should.equal(entry);
        protocol.hasValidStack(msg).should.equal(false);
    });

    it("should restore parent context or clear it at the root", function () {
        var msg = { component: { stale: true } };

        protocol.restoreParentContext(msg, { context: { _parent: { outer: true } } }, null);
        msg.component.should.eql({ outer: true });

        protocol.restoreParentContext(msg, { context: {} }, { context: { nested: true } });
        msg.component.should.eql({ nested: true });

        protocol.restoreParentContext(msg, { context: {} }, null);
        should(msg.component).equal(undefined);
    });

    it("should clear the transient component state once execution is complete", function () {
        var msg = { _comp: { stack: [] } };
        protocol.clearComponentState(msg);
        should(msg._comp).equal(undefined);
    });
});