const componentsEmitter = require("./emitter");

module.exports = function (RED) {

  const EVENT_START_FLOW = "comp-start-flow";
  const EVENT_RETURN_FLOW = "comp-flow-return";

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
      let context = {}; // context lives only until the next return node
      msg._comp.stack.push({ callerId: node.id, targetId: node.targetComponent.id, context });
      if (msg._comp.stack.length > 1) {
        // connect to parent context
        context._parent = msg._comp.stack.slice(-2)[0].context;
      }

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
        if (paramSource.global) {
          msg[paramSource.name] = val;
        } else {
          context[paramSource.name] = val;
        }
      }
      if (Object.keys(validationErrors).length > 0) {
        console.error("validation error", validationErrors);
        node.error("validation error\n" + JSON.stringify(validationErrors));
      }
      msg.component = context; // use the new context as "component"

      // send event
      componentsEmitter.emit(EVENT_START_FLOW + "-" + node.targetComponent.id, msg);
    } catch (err) {
      console.trace(err)
      node.error(err)
    }
  }

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
      if (typeof msg._comp.stack == "undefined" || msg._comp.stack == null || msg._comp.stack.length == 0) {
        node.error(RED._("components.message.invalid_stack", { nodeId: node.id }), msg);
      }
      let stack = msg._comp.stack
      let returnNode = msg._comp.returnNode;
      let lastEntry = stack.slice(-1)[0];
      let inOnlyScenario = !returnNode && lastEntry.targetId == node.targetComponent.id;
      let broadcastScenario = returnNode && returnNode.broadcast;
      let defaultScenario = returnNode && returnNode.callerId == config.id
      if (inOnlyScenario || broadcastScenario || defaultScenario) {
        // the message is for me?
        stack.pop();
        delete msg._comp.returnNode;
        if (stack.length == 0) {
          // stack is empty, so we are done.
          delete msg._comp; // -> following event listeners (component nodes) won't be able to handle this event.
          if (inOnlyScenario) {
            /*
            remove the component part, if we are in a regular flow (with a return node).
            If we are in a in-only scenario, we keep the msg.component alive. 
            This is because the caller is notified by the IN node immediatly after it sends the message out to the
            component flow. Sine we don't know when that flow ends (we receive no return event), we just let the 
            component part in the msg.
            */
            delete msg.component;
          }
        } else {
          // more on the stack, restore last context
          let lastEntry = stack.slice(-1)[0];
          msg.component = lastEntry.context;
        }

        // find outport
        if (!returnNode || returnNode.mode == "default") {
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
          node.send(msgArr.length == 1 ? msg : msgArr);
        }
        setStatuz(node, msg);
      }
    }
    componentsEmitter.on(EVENT_RETURN_FLOW + "-" + node.id, returnFromFlowHandler);
    // global event for broadcasts of in-only flows (no return node)
    componentsEmitter.on(EVENT_RETURN_FLOW, returnFromFlowHandler);

    /*
    if (isInvalidInSubflow(RED, node) == true) {
      node.error(RED._("components.message.componentInSubflow"))
      return
    }
    */

    // Clean up event handler on close
    this.on("close", function () {
      componentsEmitter.removeListener(EVENT_RETURN_FLOW + "-" + node.id, returnFromFlowHandler);
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

}; // end module.exports
