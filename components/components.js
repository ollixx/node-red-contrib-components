const EventEmitter = require('events');

module.exports = function (RED) {

  const EVENT_START_FLOW = "comp-start-flow";
  const EVENT_RETURN_FLOW = "comp-flow-return";

  class ComponentsEmitter extends EventEmitter { }
  const emitter = new ComponentsEmitter()
  emitter.setMaxListeners(0) // remove "MaxListenersExceededWarning"

  /** 
   * Retrieve all nodes, that are wired to call the given nodeid.
   * Then retrieve the parent callers for each of the found nodes revcursively
   * This func is also aware of link nodes.
   * The retrieval list can be reduced by passing in a filter function
  */
  function getCallerHierarchy(targetid, filter = null) {
    let result = {}
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
                        callers: getCallerHierarchy(linkOutId, filter)
                      }
                    }
                  })
                })
                result[child.id] = linkHierarchy
              } else {
                result[child.id] = {
                  node: child,
                  callers: getCallerHierarchy(child.id, filter)
                }
              }
            }
          })
        })
      }
    })
    return result
  }

  function sendStartFlow(msg, node) {
    try {
      // create / update state for new execution
      if (typeof msg._comp == "undefined") {
        // create from scratch
        msg._comp = {
          stack: []
        };
      }
      // target node's id (component in) to start flow
      msg._comp.target = node.targetComponent.id;
      // push my ID onto the stack - the next return will come back to me
      msg._comp.stack.push(node.id)

      // setup msg from parameters
      let validationErrors = {}
      for (var paramName in node.paramSources) {
        let paramSource = node.paramSources[paramName];
        let sourceType = paramSource.sourceType;
        let val = null;
        // make sure, the user entered a valid source
        if (!paramSource) {
          validationErrors[paramName] = "missing source. please set the parameter to a valid input"
        }
        // an empty, optional parameter is evaluated only, if the source type is "string".
        // In that case, the parameter is set(!). It is not put into the message in all other cases.
        if (paramSource.source && paramSource.source.length > 0 || sourceType == "str") {
          val = RED.util.evaluateNodeProperty(paramSource.source, paramSource.sourceType, node, msg);
        }
        if (val == null || val == undefined) {
          if (paramSource.required) {
            node.status({ fill: "red", shape: "ring", text: RED._("components.label.required") + ": '" + paramSource.name + "'" });
            validationErrors[paramName] = RED._("components.message.missingProperty", { parameter: paramSource.name });
          }
        } else {
          // validate types
          let type = typeof (val)
          switch (paramSource.type) {
            case "num": {
              if (type != "number") {
                validationErrors[paramName] = RED._("components.message.validationError",
                  { parameter: paramSource.name, expected: paramSource.type, invalidType: type, value: val });
              }
              break;
            }
            case "string": {
              if (type != "string") {
                validationErrors[paramName] = RED._("components.message.validationError",
                  { parameter: paramSource.name, expected: paramSource.type, invalidType: type, value: val });
              }
              break;
            }
            case "boolean": {
              if (type != "boolean") {
                validationErrors[paramName] = RED._("components.message.validationError",
                  { parameter: paramSource.name, expected: paramSource.type, invalidType: type, value: val });
              }
              break;
            }
            case "json": {
              try {
                if (type != "object") {
                  JSON.parse(val);
                }
              } catch (err) {
                console.error("invalid json", val)
                validationErrors[paramName] = RED._("components.message.jsonValidationError",
                  { parameter: paramSource.name, value: val });
              }
              break;
            }
            case "any":
            default:
              break;
          }
        }
        msg[paramSource.name] = val;
      }
      if (Object.keys(validationErrors).length > 0) {
        node.error("validation error", validationErrors)
      }

      // send event
      emitter.emit(EVENT_START_FLOW, msg);
    } catch (err) {
      console.trace(err)
      node.error(err)
    }
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

  // find all RETURN component nodes, that are connected to me.
  // traverses all connected nodes, including link nodes
  const findReturnNodes = function (node, foundNodes, type = "component_out") {
    try {
      if (node.wires && node.wires.length > 0) {
        node.wires.forEach((outPort) => {
          outPort.forEach((childid) => {
            let child = RED.nodes.getNode(childid);
            if (child.type == type) {
              foundNodes[childid] = child;
            } else if (child.type == "link out") {
              // look for more nodes at the other side of the link
              child.links.forEach((linkid) => {
                findReturnNodes(linkid, foundNodes)
              })
            } else {
              // look for connected nodes
              findReturnNodes(childid, foundNodes)
            }
          })
        });
      }
    } catch (err) {
      console.trace(err)
      node.error(err)
    }
  }

  /*

        ******* COMPONENT IN *************
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
    emitter.on(EVENT_START_FLOW, startFlowHandler);

    // Clean up event handler
    this.on("close", function () {
      emitter.removeListener(EVENT_START_FLOW, startFlowHandler);
    });

    this.on("input", function (msg) {
      if (node.invalid) {
        node.error("component not allowed in subflow")
        return
      }
      let stack = msg._comp.stack;
      node.status({ fill: "grey", shape: "ring", text: RED._("components.message.lastCaller") + ": " + stack[stack.length - 1] });
      this.send(msg);

      // if this START node is not connected to a return node, we send back a notification to the RUN node.
      let foundReturnNodes = {}
      findReturnNodes(node, foundReturnNodes)
      if (Object.keys(foundReturnNodes).length == 0) {
        // send event
        emitter.emit(EVENT_RETURN_FLOW, msg);
      }
    });

  } // END: COMPONENT IN

  /*
    
    ******* RUN COMPONENT ************
    second node: component (use a component)

  */
  RED.nodes.registerType("component", component);
  function component(config) {
    // Create our node and event handler
    RED.nodes.createNode(this, config);

    var node = this;
    node.targetComponent = config.targetComponent;
    node.paramSources = config.paramSources;
    node.statuz = config.statuz;
    node.statuzType = config.statuzType;
    node.outLabels = config.outLabels;

    if (!node.targetComponent || !node.targetComponent.id) {
      node.error(RED._("components.message.componentNotConnected"))
      node.status({ fill: "red", shape: "dot", text: RED._("components.message.componentNotConnected") })
    }

    function setStatuz(node, msg) {
      let done = (err, statuz) => {
        if (typeof (statuz) != "object") {
          statuz = { text: statuz }
        }
        node.status(statuz);
      }
      if (node.propertyType === 'jsonata') {
        RED.util.evaluateJSONataExpression(node.statuz, msg, (err, val) => {
          done(undefined, val)
        });
      } else {
        let res = RED.util.evaluateNodeProperty(node.statuz, node.statuzType, node, msg, (err, val) => {
          done(undefined, val)
        });
      }
    }

    var returnFromFlowHandler = function (msg) {
      if (msg._comp === undefined) {
        // this happens, if a receiver has already handled the event in this very same method.
        // Since the msg sent to all listeners is the same(!) js object and we modify it here,
        // the next listener does not receive the _comp anymore. And so should skip it, as there
        // can only be one legal receiver.
        return
      }
      if (typeof msg._comp.stack == "undefined" || msg._comp.stack == null) {
        node.error(RED._("components.message.invalid_stack", { nodeId: node.id }), msg);
      }
      let stack = msg._comp.stack
      let callerId = stack.pop(); // get the last entry, with an id matching this node's id
      if (callerId != config.id) {
        // put back the callerId onto the stack, so the next event listener can actually find it.
        stack.push(callerId);
      } else {
        // the message is for me
        let returnNode = msg._comp.returnNode;
        if (stack.length == 0) {
          // stack is empty, so we are done.
          delete msg._comp; // -> following event listeners (component nodes) won't be able to handle this event.
        } else {
          // check, if the next entry in the stack is from this node
          let peek = stack.pop();
          stack.push(peek);
          if (peek.component == node.id) {
            node.status({ fill: "green", shape: "dot", text: RED._("components.message.running") })
            sendStartFlow(msg, node);
            return
          }
        }
        // check for no-return component (IN only)
        if (returnNode === undefined) {
          node.status({})
          return
        }

        // find outport
        if (returnNode.mode == "default") {
          node.send(msg);
        } else {
          msgArr = [];
          let portLabel
          for (let i in node.outLabels) {
            portLabel = node.outLabels[i]
            if (portLabel == returnNode.name || portLabel == returnNode.id) {
              msgArr.push(msg);
            } else {
              msgArr.push(null);
            }
          }
          node.send(msgArr);
        }
        setStatuz(node, msg);
      }
    }
    emitter.on(EVENT_RETURN_FLOW, returnFromFlowHandler);

    if (isInvalidInSubflow(RED, node) == true) {
      node.error(RED._("components.message.componentInSubflow"))
      return
    }

    // Clean up event handler on close
    this.on("close", function () {
      emitter.removeListener(EVENT_RETURN_FLOW, returnFromFlowHandler);
      node.status({});
    });

    this.on("input", function (msg) {
      if (!node.targetComponent || !node.targetComponent.id) {
        node.error(RED._("components.message.componentNotConnected"))
        node.status({ fill: "red", shape: "dot", text: RED._("components.message.componentNotConnected") })
        return
      }
      node.status({ fill: "green", shape: "ring", text: RED._("components.message.running") });
      sendStartFlow(msg, node);
    });

  } // END: RUN COMPONENT

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
    let findInComponentNode = function (callers) {
      let found = {}
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
          let callerId = msg._comp.stack.pop();
          msg._comp.stack.push(callerId);
          msg._comp.returnNode = {
            id: node.id,
            mode: node.mode,
            name: node.name
          }
          // send event
          emitter.emit(EVENT_RETURN_FLOW, msg);
        } else {
          // broadcast the message to all RUN node
          try {
            RED.nodes.eachNode((runNode) => {
              if (runNode.type == "component") {
                if (runNode.targetComponent && runNode.targetComponent.id == node.inNode.id) {
                  if (msg._comp === undefined) {
                    msg._comp = {
                      stack: []
                    };
                  }
                  msg._comp.target = runNode.targetComponent.id;
                  msg._comp.stack.push(runNode.id)
                  msg._comp.returnNode = {
                    id: node.id,
                    mode: node.mode,
                    name: node.name
                  }
                  emitter.emit(EVENT_RETURN_FLOW, msg);
                }
              }
            });
          } catch (err) {
            console.trace(err)
            node.error("err in out", err)
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
