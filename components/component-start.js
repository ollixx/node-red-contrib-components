const componentsEmitter = require("./emitter");

module.exports = function (RED) {

  const EVENT_START_FLOW = "comp-start-flow";
  const EVENT_RETURN_FLOW = "comp-flow-return";

  function isInvalidInSubflow(red, node) {
    let found = false
    RED.nodes.eachNode((n) => {
      if (n.id == node.z && n.type.startsWith("subflow")) {
        found = true
      }
    })
    return found
  }

  // find all RETURN component nodes, that are connected to me.
  // traverses all connected nodes, including link nodes
  const findReturnNodes = function (nodeid, foundNodes, type = "component_out", visited = []) {
    if (visited.includes(nodeid)) {
      // already been here, so quit
      return;
    }
    visited.push(nodeid); // mark as vistited
    let node = RED.nodes.getNode(nodeid);
    try {
      let node = RED.nodes.getNode(nodeid);
      if (node.wires && node.wires.length > 0) {
        node.wires.forEach((outPort) => {
          outPort.forEach((childid) => {
            let child = RED.nodes.getNode(childid);
            if (child === undefined) {
              throw "could not find node for id" + childid;
            }
            if (child.type == type) {
              foundNodes[childid] = child;
            } else if (child.type == "link out") {
              // look for more nodes at the other side of the link
              if (child.links) {
                // old nr:
                child.links.forEach((linkid) => {
                  findReturnNodes(linkid, foundNodes, type, visited)
                })
              } else if (child.wires) {
                // nr2
                child.wires[0].forEach((linkid) => {
                  findReturnNodes(linkid, foundNodes, type, visited)
                })
              }
            }
            // look for connected nodes
            findReturnNodes(childid, foundNodes, type, visited)
          })
        });
      }
    } catch (err) {
      console.trace(err)
      node.error(err)
    }
  }

  /*

        ******* COMPONENT START *************
        first node: componet in
  
  */
  RED.nodes.registerType("component_in", componentIn);
  function componentIn(config) {
    // Create our node and event handler
    RED.nodes.createNode(this, config);
    var node = this;

    var startFlowHandler = function (msg) {
      try {
        if (isInvalidInSubflow(RED, node) == true) {
          node.error("component defintion is not allowed in subflow.")
          return
        }
        let target = msg._comp ? msg._comp.target : undefined;
        if (target == node.id) {
          node.receive(msg);
        }
      } catch (err) {
        console.trace(err)
        node.error(err)
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
      let stack = msg._comp.stack;
      let lastEntry = stack.slice(-1)[0];
      node.status({ fill: "grey", shape: "ring", text: RED._("components.message.lastCaller") + ": " + lastEntry.callerId });
      this.send(msg);

      // If this START node is not connected to a return node, we send back a notification to the calling RUN node, so it can continue.
      let foundReturnNodes = {}
      findReturnNodes(node.id, foundReturnNodes)
      if (Object.keys(foundReturnNodes).length == 0) {
        // send event to caller, so he can finish his "running" state
        componentsEmitter.emit(EVENT_RETURN_FLOW + "-" + lastEntry.callerId, msg);
      }
    });

  } // END: COMPONENT IN

}; // end module.exports
