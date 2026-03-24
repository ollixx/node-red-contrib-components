const componentsEmitter = require("./emitter");
const {
  createStackEntry,
  ensureComponentState,
  peekStackEntry,
  pushStackEntry,
  setReturnNode,
  setTarget
} = require("./lib/comp-protocol");
const {
  findComponentInNodes,
  getCallerHierarchy,
  getRunnerNodesForTarget,
  isInvalidInSubflow
} = require("./lib/runtime-graph");

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
        ******* COMPONENT RETURN *************
        third node: component out

  */
  RED.nodes.registerType("component_out", componentOut);
  function componentOut(config) {
    // Create our node and event handler
    RED.nodes.createNode(this, config);
    var node = this;

    // fix legacy nodes without mode
    node.mode = config.mode || "default";

    // look for the component IN that I belong to:
    let callers = getCallerHierarchy(RED, node.id)
    let foundInNodes = findComponentInNodes(callers)
    node.inNodeLength = Object.keys(foundInNodes).length
    if (node.inNodeLength != 1) {
      node.error(RED._("components.message.returnWithoutStart", { inNodeLength: node.inNodeLength }))
      node.invalid = true
    } else {
      node.inNode = Object.values(foundInNodes)[0]
    }

    if (isInvalidInSubflow(RED, node) == true) {
      node.error(RED._("components.message.componentInSubflow"))
      return
    }

    this.on("input", function (msg) {
      try {
        if (isInvalidInSubflow(RED, node) == true) {
          node.error(RED._("components.message.componentInSubflow"))
          return
        }

        if (node.invalid) {
          node.error(RED._("components.message.returnWithoutStart", { inNodeLength: node.inNodeLength }))
          return // stop execution here
        }

        // create / update state for new execution
        if (msg._comp !== undefined) {
          // peek into stack to know where to return:
          let entry = peekStackEntry(msg);
          if (!entry) {
            node.error(RED._("components.message.invalid_stack", { nodeId: node.id }), msg)
            return
          }
          setReturnNode(msg, {
            id: node.id,
            callerId: entry.callerId, // prevent unwanted return chain
            mode: node.mode,
            name: node.name
          })
          // send event
          componentsEmitter.emit(EVENT_RETURN_FLOW + "-" + entry.callerId, msg);
        } else {
          // broadcast the message to all RUN node
          try {
            if (!node._broadcastTargetIds) {
              node._broadcastTargetIds = getRunnerNodesForTarget(RED, node.inNode.id).map((runNode) => runNode.id)
            }

            node._broadcastTargetIds.forEach((runNodeId) => {
              const runNode = RED.nodes.getNode(runNodeId);
              if (!runNode) {
                return
              }

              const targetComponentId = runNode.targetComponentId || (runNode.targetComponent && runNode.targetComponent.id);
              if (targetComponentId !== node.inNode.id) {
                return
              }

              const targetComponent = RED.nodes.getNode(targetComponentId);
              ensureComponentState(msg);
              setTarget(msg, targetComponentId);
              pushStackEntry(msg, createStackEntry(runNode.id, targetComponentId, targetComponent && targetComponent.usecontext ? {} : undefined));
              setReturnNode(msg, {
                id: node.id,
                mode: node.mode,
                name: node.name,
                broadcast: true
              })
              componentsEmitter.emit(EVENT_RETURN_FLOW + "-" + runNode.id, msg);
            });
          } catch (err) {
            node.error(normalizeError(err, "component return broadcast failed"), msg);
          }
        }
      } catch (err) {
        node.error(normalizeError(err, "component return failed"), msg)
      }
    }); // END: on input

  } // END: COMPONENT RETURN

}; // end module.exports
