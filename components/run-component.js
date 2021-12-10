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
      msg._comp.target = node.targetComponentId;
      let targetComponent = RED.nodes.getNode(node.targetComponentId);
      let usecontext = targetComponent.usecontext;

      // push my ID onto the stack - the next return will come back to me
      let stackEntry = { callerId: node.id, targetId: node.targetComponentId }
      let context;
      if (usecontext) {
        context = {}; // context lives only until the next return node
        if (msg._comp.stack.length > 1) {
          // connect to parent context
          context._parent = msg._comp.stack.slice(-2)[0].context;
        }
        stackEntry.context = context;
      }
      console.log("start flow", node.id, "usecontext?", usecontext);
      msg._comp.stack.push(stackEntry);

      // setup msg from parameters
      let validationErrors = {}
      // we read the list from the current targetComponent, as it might have changed without touching the RUN node.
      // That means, that some parameters are not reflected or changed in the paramSources.
      // That also means, that the RUN node should only keep track of: name, source, sourceType
      for (var paramIndex in targetComponent.api) {
        let paramDef = targetComponent.api[paramIndex];
        let paramName = paramDef.name;
        let paramSource = node.paramSources[paramName];
        let val = null;

        // If this RUN node has not yet a source definiton (was not touched after an API change), we just check for required params.
        if (!paramSource) {
          if (paramDef.required) {
            validationErrors[paramName] = "missing source. please set the parameter to a valid input"
          }
          continue; // more cheks not possible if we have no paramSource here.
        }

        // an empty, optional parameter is evaluated only, if the source type is "string".
        // In that case, the parameter is set(!). It is not put into the message in all other cases.
        if (paramSource.source && paramSource.source.length > 0 || paramSource.sourceType == "str") {
          val = RED.util.evaluateNodeProperty(paramSource.source, paramSource.sourceType, node, msg);
        }
        if (val == null || val == undefined) {
          if (paramDef.required) {
            validationErrors[paramName] = RED._("components.message.missingProperty", { parameter: paramName });
          }
        } else {
          // validate types
          let type = typeof (val)
          switch (paramDef.type) {
            case "num": {
              if (type != "number") {
                validationErrors[paramName] = RED._("components.message.validationError",
                  { parameter: paramName, expected: paramDef.type, invalidType: type, value: val });
              }
              break;
            }
            case "string": {
              if (type != "string") {
                validationErrors[paramName] = RED._("components.message.validationError",
                  { parameter: paramName, expected: paramDef.type, invalidType: type, value: val });
              }
              break;
            }
            case "boolean": {
              if (type != "boolean") {
                validationErrors[paramName] = RED._("components.message.validationError",
                  { parameter: paramName, expected: paramDef.type, invalidType: type, value: val });
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
                  { parameter: paramName, value: val });
              }
              break;
            }
            case "any":
            default:
              break;
          }
        }
        if (usecontext && paramDef.contextOption) {
          // local param
          context[paramName] = val;
        } else {
          msg[paramName] = val;
        }
      }

      if (usecontext) {
        msg.component = context;
      }

      if (Object.keys(validationErrors).length > 0) {
        node.status({ fill: "red", shape: "ring", text: RED._("components.message.hasValidationErrors") });
        node.error({ validationErrors: validationErrors });
      } else {
        // send event
        componentsEmitter.emit(EVENT_START_FLOW + "-" + node.targetComponentId, msg);
      }
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
    node.targetComponentId = config.targetComponentId || config.targetComponent.id;
    node.paramSources = config.paramSources;
    node.statuz = config.statuz;
    node.statuzType = config.statuzType;
    node.outLabels = config.outLabels;

    if (!node.targetComponentId) {
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
      let usecontext = lastEntry.context ? true : false;
      let inOnlyScenario = !returnNode && lastEntry.targetId == node.targetComponentId;
      let broadcastScenario = returnNode && returnNode.broadcast;
      let defaultScenario = returnNode && returnNode.callerId == config.id
      if (inOnlyScenario || broadcastScenario || defaultScenario) {
        // the message is for me?
        stack.pop();
        delete msg._comp.returnNode;
        if (stack.length == 0) {
          // stack is empty, so we are done.
          delete msg._comp; // -> following event listeners (component nodes) won't be able to handle this event.
          if (usecontext && !inOnlyScenario) {
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
          if (usecontext) {
            let lastEntry = stack.slice(-1)[0];
            if (lastEntry.context) {
              msg.component = lastEntry.context;
            } else {
              delete msg.component; // parent has no context (probably usecontext = false!)
            }
          }
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
      if (!node.targetComponentId) {
        node.error(RED._("components.message.componentNotConnected"))
        node.status({ fill: "red", shape: "dot", text: RED._("components.message.componentNotConnected") })
        return
      }

      node.status({ fill: "green", shape: "ring", text: RED._("components.message.running") });
      sendStartFlow(msg, node);
    });

  } // END: RUN COMPONENT

}; // end module.exports
