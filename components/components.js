module.exports = function (RED) {

  const EVENT_PREFIX = "comp-";

  /*

        ******* COMPONENT IN *************
        first node: componet in
  
  */
  RED.nodes.registerType("component_in", componentIn);
  function componentIn(config) {
    var node = this;

    // Create our node and event handler
    RED.nodes.createNode(this, config);
    var handler = function (msg) {
      let target = msg._comp ? msg._comp.target : undefined;
      if (target == node.id) {
        node.receive(msg);
      }
    }
    RED.events.on(EVENT_PREFIX, handler);

    // Clean up event handler
    this.on("close", function () {
      RED.events.removeListener(EVENT_PREFIX, handler);
    });

    this.on("input", function (msg) {
      let stack = msg._comp.stack;
      node.status({ fill: "grey", shape: "ring", text: RED._("components.message.lastCaller") + ": " + stack[stack.length - 1] });
      this.send(msg);
    });

  } // END: COMPONENT IN

  /*
    
    ******* RUN COMPONENT ************
    second node: component (use a component)

  */
  RED.nodes.registerType("component", component);
  function component(config) {
    var node = this;
    node.targetComponent = config.targetComponent;
    node.paramSources = config.paramSources;
    node.statuz = config.statuz;
    node.statuzType = config.statuzType;
    node.outLabels = config.outLabels;

    // Create our node and event handler
    RED.nodes.createNode(this, config);

    function setStatuz(node, msg) {
      let done = (err, statuz) => {
        if (typeof(statuz) != "object") {
          statuz = {text: statuz}
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

    var handler = function (msg, send) {
      if (typeof msg._comp == "undefined" || msg._comp == null) {
        throw RED._("components.message.invalid_comp", { nodeId: node.id });
      }
      if (typeof msg._comp.stack == "undefined" || msg._comp.stack == null) {
        throw RED._("components.message.invalid_stack", { nodeId: node.id });
      }
      let stack = msg._comp.stack;
      let callerEvent = stack.pop(); // get the last entry, with an id matching this node's id
      if (callerEvent != EVENT_PREFIX + config.id) {
        throw RED._("components.message.invalid_idMatch", { nodeId: node.id, callerId: callerEvent });
      }
      let returnNode = msg._comp.returnNode;
      if (stack.length == 0) {
        // stack is empty, so we are done.
        delete msg._comp;
      } else {
        // check, if the next entry in the stack is from this node
        let peek = stack.pop();
        stack.push(peek);
        if (peek.component == node.id) {
          sendStartFlow(msg, node);
          node.status({ fill: "green", shape: "ring", text: RED._("components.message.running") })
          return
        }
      }
      // find outport
      if (returnNode.mode == "default") {
        node.send(msg);
      } else {
        msgArr = [];
        for (let i in node.outLabels) {
          if (node.outLabels[i] == returnNode.name || node.outLabels[i] == returnNode.id) {
            msgArr.push(msg);
          } else {
            msgArr.push(null);
          }
        }
        node.send(msgArr);
      }
      setStatuz(node, msg);
    }
    RED.events.on(EVENT_PREFIX + config.id, handler);

    // Clean up event handler on close
    this.on("close", function () {
      RED.events.removeListener(EVENT_PREFIX + config.id, handler);
      node.status({});
    });

    this.on("input", function (msg) {
      sendStartFlow(msg, node);
      node.status({ fill: "green", shape: "ring", text: RED._("components.message.running") });
    });

    function sendStartFlow(msg, node) {
      var event = EVENT_PREFIX + config.id;

      // create / update state for new execution
      if (typeof msg._comp == "undefined") {
        // create from scratch
        msg._comp = {
          stack: []
        };
      }
      // target node's id (component in) to start flow
      msg._comp.target = node.targetComponent.id;
      msg._comp.stack.push(event)

      // setup msg from parameters
      let validationErrors = {}
      for (var paramName in node.paramSources) {
        let paramSource = node.paramSources[paramName];
        let sourceType = paramSource.sourceType;
        let val = null;
        // an empty, optional parameter is evaluated only, if the source type is "string".
        // In that case, the parameter is set(!). It is not put into the message in all other cases.
        if (paramSource.source.length > 0 || sourceType == "str") {
          val = RED.util.evaluateNodeProperty(paramSource.source, paramSource.sourceType, node, msg);
        }
        if (val == null || val == undefined) {
          if (paramSource.required) {
            node.status({ fill: "red", shape: "ring", text: RED._("components.label.required") + ": '" + paramSource.name + "'" });
            throw RED._("components.message.missingProperty", { parameter: paramSource.name });
          }
        } else {
          if (paramSource.required) {
            // validate types
            let type = typeof(val)
            switch (paramSource.type) {
              case "num": {
                if (type != "number") {
                  validationErrors[paramName] = RED._("components.message.validationError", 
                    { parameter: paramSource.name, expected: paramSource.type, invalidType: type, value: val});
                }
                break;
              }
              case "string": {
                if (type != "string") {
                  validationErrors[paramName] = RED._("components.message.validationError", 
                    { parameter: paramSource.name, expected: paramSource.type, invalidType: type, value: val});
                }
                break;
              }
              case "boolean": {
                if (type != "boolean") {
                  validationErrors[paramName] = RED._("components.message.validationError", 
                    { parameter: paramSource.name, expected: paramSource.type, invalidType: type, value: val});
                }
                break;
              }
              case "json": {
                try {
                  if (type == "object") {
                    // we have to check 
                    val = JSON.stringify(val)
                  }
                  val = JSON.parse(val);
                } catch(err) {
                  validationErrors[paramName] = RED._("components.message.jsonValidationError", 
                    { parameter: paramSource.name, value: val});
                }
                break;
              }
              case "any":
              default:
                break;
            }
          }
        }
        msg[paramSource.name] = val;
      }
      if (Object.keys(validationErrors).length > 0) {
        throw validationErrors
      }

      // send event
      RED.events.emit(EVENT_PREFIX, msg);
    }

  } // END: RUN COMPONENT

  /*

  			******* COMPONENT RETURN *************
        third node: component out

  */
  RED.nodes.registerType("component_out", componentOut);
  function componentOut(config) {
    var node = this;

    // Create our node and event handler
    RED.nodes.createNode(this, config);
    node.mode = config.mode;

    // get all nodes calling me:
    let getCallingNodes = function (parent) {
      let callerList = {}
      RED.nodes.eachNode((child) => {
        if (child.wires && child.wires.length > 0) {
            child.wires[0].forEach((nodeid) => {
                if (nodeid == parent.id) {
                    callerList[child.id] = child;
                }
            })
        }
      });
      return callerList;
    }

    // look for the component IN that I belong to:
    let findInComponentNode = function (parent) {
      let found = {}
      let callers = getCallingNodes(parent);
      Object.entries(callers).forEach(([id, node]) => {
        if (node.type == "component_in") {
          found[id] = node;
        } else {
          found = {...found, ...findInComponentNode(node)}
        }
      })
      return found;
    }

    this.on("input", function (msg) {

      // create / update state for new execution
      if (typeof msg._comp != "undefined") {
        // peek into stack to know where to return:
        let callerEvent = msg._comp.stack.pop();
        msg._comp.stack.push(callerEvent);
        msg._comp.returnNode = {
          id: node.id,
          mode: node.mode,
          name: node.name
        }
        // send event
        RED.events.emit(callerEvent, msg);
      }

    });
  } // END: COMPONENT RETURN

}; // end module.exports
