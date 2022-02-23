const componentsEmitter = require("./emitter");

module.exports = function (RED) {

  const EVENT_START_FLOW = "comp-start-flow";
  const EVENT_RETURN_FLOW = "comp-flow-return";

  /** 
   * Retrieve all nodes, that are wired to call the given nodeid.
   * Then retrieve the parent callers for each of the found nodes revcursively
   * This func is also aware of link nodes.
   * The retrieval list can be reduced by passing in a filter function
  */
  function getCallerHierarchy(targetid, filter = null, visited = []) {
    let result = {}
    if (visited.includes(targetid)) {
      return result;
    }
    visited.push(targetid);
    RED.nodes.eachNode((child) => {
      if (child.wires) {
        child.wires.forEach((port) => {
          port.forEach((nodeid) => {
            if (nodeid == targetid) {
              // handle link nodes
              if (child.type == "link in") {
                let linkHierarchy = {
                  node: child,
                  callers: {}
                }
                child.links.forEach((linkOutId) => {
                  RED.nodes.eachNode((foundNode) => {
                    if (linkOutId == foundNode.id) {
                      linkHierarchy.callers[linkOutId] = {
                        node: foundNode,
                        callers: getCallerHierarchy(linkOutId, filter, visited)
                      }
                    }
                  })
                })
                result[child.id] = linkHierarchy
              } else {
                result[child.id] = {
                  node: child,
                  callers: getCallerHierarchy(child.id, filter, visited)
                }
              }
            }
          })
        })
      }
    })
    return result
  }

  function isInvalidInSubflow(red, node) {
    let found = false
    RED.nodes.eachNode((n) => {
      if (n.id == node.z && n.type.startsWith("subflow")) {
        found = true
      }
    })
    return found
  }

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
    let findInComponentNode = function (callers, found = {}) {
      Object.entries(callers).forEach(([id, entry]) => {
        if (entry.node.type == "component_in") {
          found[id] = entry.node;
        } else {
          found = { ...found, ...findInComponentNode(entry.callers) }
        }
      })
      return found;
    }

    let callers = getCallerHierarchy(node.id)
    let foundInNodes = findInComponentNode(callers)
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
          let entry = msg._comp.stack.slice(-1)[0];
          msg._comp.returnNode = {
            id: node.id,
            callerId: entry.callerId, // prevent unwanted return chain
            mode: node.mode,
            name: node.name
          }
          // send event
          componentsEmitter.emit(EVENT_RETURN_FLOW + "-" + entry.callerId, msg);
        } else {
          // broadcast the message to all RUN node
          try {
            RED.nodes.eachNode((runNode) => {
              if (runNode.type == "component") {
                let targetComponent = RED.nodes.getNode(runNode.targetComponentId);
                // legacy
                if (!targetComponent) {
                  console.log("legacy", runNode);
                  console.log("_comp?", msg._comp);
                  targetComponent = RED.nodes.getNode(runNode.targetComponent.id);
                }

                if (targetComponent && targetComponent.id == node.inNode.id) {
                  if (msg._comp === undefined) {
                    msg._comp = {
                      stack: []
                    };
                  }
                  msg._comp.target = targetComponent.id;
                  let stackEntry = { callerId: runNode.id, targetId: targetComponent.id };
                  if (targetComponent && targetComponent.usecontext) {
                    stackEntry.context = {}
                  }
                  msg._comp.stack.push(stackEntry)
                  msg._comp.returnNode = {
                    id: node.id,
                    mode: node.mode,
                    name: node.name,
                    broadcast: true
                  }
                  componentsEmitter.emit(EVENT_RETURN_FLOW + "-" + runNode.id, msg);
                }
              }
            });
          } catch (err) {
            console.trace(node.name || node.type, node.id, err)
            node.error("err in out:  " + err);
          }
        }
      } catch (err) {
        console.trace(err)
        node.error("err in return", err)
        // console.trace()
      }
    }); // END: on input

  } // END: COMPONENT RETURN

}; // end module.exports
