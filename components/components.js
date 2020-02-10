module.exports = function (RED) {

  const EVENT_PREFIX = "comp-";

  // first node: componet in
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

  }
  // second node: component (use a component)
  RED.nodes.registerType("component", component);
  function component(config) {
    var node = this;
    node.targetComponent = config.targetComponent;
    node.paramSources = config.paramSources;

    // Create our node and event handler
    RED.nodes.createNode(this, config);

    var handler = function (msg) {
      if (typeof msg._comp == "undefined" || msg._comp == null) {
        throw RED._("components.message.invalid_comp", { nodeId: node.id });
        // throw "component " + node.id + " received invalid event. msg._comp is undefined or null";
      }
      if (typeof msg._comp.stack == "undefined" || msg._comp.stack == null) {
        throw RED._("components.message.invalid_stack", { nodeId: node.id });
        // throw "component " + node.id + " received invalid event. msg._comp.stack is undefined or null";
      }
      let stack = msg._comp.stack;
      let callerEvent = stack.pop(); // get the last entry, with an id matching this node's id
      if (callerEvent != EVENT_PREFIX + config.id) {
        throw RED._("components.message.invalid_idMatch", { nodeId: node.id, callerId: callerEvent });
        // throw "component " + node.id + " received invalid event. id does not match: " + callerEvent;
      }
      if (stack.length == 0) {
        // stack is empty, so we are done.
        delete msg._comp;
        node.send(msg);
        node.status({});
      } else {
        // check, if the next entry in the stack is from this node
        let peek = stack.pop();
        stack.push(peek);
        if (peek.component == node.id) {
          sendStartFlow(msg, node);
          node.status({ fill: "green", shape: "ring", text: RED._("components.message.running") });
        } else {
          // next entry on stack is for another caller, so we are done.
          node.send(msg);
          node.status({});
        }
      }
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
      msg._comp.target = node.targetComponent;
      msg._comp.stack.push(event)

      // setup msg from parameters
      for (var paramName in node.paramSources) {
        try {
          let paramSource = node.paramSources[paramName];
          let sourceType = paramSource.sourceType;
          let val = null;
          // an empty, optional parameter is evaluated only, if the source type is "string".
          // In that case, the parameter is set(!). It is not put into the message in all other cases.
          if (paramSource.source.length > 0 || sourceType == "str" ) {
            val = RED.util.evaluateNodeProperty(paramSource.source, paramSource.sourceType, node, msg);
          }
          if (val == null || val == undefined) {
            if (paramSource.required) {
              node.status({ fill: "red", shape: "ring", text: RED._("components.label.required") + ": '" + paramSource.name + "'" });
              throw RED._("components.message.missingProperty", { parameter: paramSource.name });
            }
          } else {
            msg[paramSource.name] = val;
          }
        } catch (err) {
          console.log("err in sendStartFlow", err);
        }
      }

      // send event
      RED.events.emit(EVENT_PREFIX, msg);
    }

  }

  // third node: component out
  RED.nodes.registerType("component_out", componentOut);
  function componentOut(config) {
    var node = this;

    // Create our node and event handler
    RED.nodes.createNode(this, config);


    this.on("input", function (msg) {

      // create / update state for new execution
      if (typeof msg._comp != "undefined") {
        // peek into stack to know where to return:
        let callerEvent = msg._comp.stack.pop();
        msg._comp.stack.push(callerEvent);
        // send event
        RED.events.emit(callerEvent, msg);
      }

    });
  }

}; // end module.exports
