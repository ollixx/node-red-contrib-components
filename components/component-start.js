const componentsEmitter = require("./emitter");
const { clearTarget, peekStackEntry } = require("./lib/comp-protocol");
const { findConnectedNodesByType, isInvalidInSubflow } = require("./lib/runtime-graph");

function normalizeError(err, fallbackMessage) {
  if (err instanceof Error) {
    return err;
  }
  return new Error(fallbackMessage || String(err));
}

module.exports = function (RED) {

  const EVENT_START_FLOW = "comp-start-flow";
  const EVENT_RETURN_FLOW = "comp-flow-return";

  /*

        ******* COMPONENT START *************
        first node: componet in
  
  */
  RED.nodes.registerType("component_in", componentIn);
  function componentIn(config) {
    // Create our node and event handler
    RED.nodes.createNode(this, config);
    var node = this;

    node.usecontext = config.usecontext || false;
    node.api = config.api; // keep in the node to let RUN nodes find it at runtime (after changes in START only)

    var startFlowHandler = function (msg) {
      try {
        if (isInvalidInSubflow(RED, node) == true) {
          node.error("component defintion is not allowed in subflow.")
          return
        }
        let target = msg._comp ? msg._comp.target : undefined;
        if (target == node.id) {
          clearTarget(msg); // remove flag to start this node.
          node.receive(msg);
        }
      } catch (err) {
        node.error(normalizeError(err, "component start failed"), msg)
      }
    }
    componentsEmitter.on(EVENT_START_FLOW + "-" + node.id, startFlowHandler);

    // Clean up event handler
    this.on("close", function () {
      componentsEmitter.removeListener(EVENT_START_FLOW + "-" + node.id, startFlowHandler);
    });

    this.on("input", function (msg) {
      if (node.invalid) {
        node.error("component not allowed in subflow")
        return
      }
      let lastEntry = peekStackEntry(msg);
      if (!lastEntry) {
        node.error(RED._("components.message.invalid_stack", { nodeId: node.id }), msg)
        return
      }
      node.status({ fill: "grey", shape: "ring", text: RED._("components.message.lastCaller") + ": " + lastEntry.callerId });
      this.send(msg);

      // If this START node is not connected to a return node, we send back a notification to the calling RUN node, so it can continue.
      if (!node._returnNodeIds) {
        node._returnNodeIds = Object.keys(findConnectedNodesByType(RED, node.id))
      }
      if (node._returnNodeIds.length == 0) {
        // send event to caller, so he can finish his "running" state
        componentsEmitter.emit(EVENT_RETURN_FLOW + "-" + lastEntry.callerId, RED.util.cloneMessage(msg));
      }
    });

  } // END: COMPONENT IN

}; // end module.exports
