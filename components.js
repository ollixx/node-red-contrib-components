module.exports = function(RED) {

  const EVENT_PREFIX = "comp-";

  // first node: componet in
  RED.nodes.registerType("component_in", componentIn);
  function componentIn(config) {
    var node = this;

    // Create our node and event handler
    RED.nodes.createNode(this, config);
    var handler = function(msg) {
        let target = msg._comp ? msg._comp.target : undefined;
        if (target == node.id) {
          node.receive(msg);
        }
    }
    RED.events.on(EVENT_PREFIX, handler);

    // Clean up event handler
    this.on("close",function() {
        RED.events.removeListener(EVENT_PREFIX, handler);
    });

    this.on("input", function(msg) {
      console.log("in: ", msg);
      let stack = msg._comp.stack;
      node.status({fill:"grey",shape:"ring",text: "last caller: " + stack[stack.length -1] });
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

    var handler = function(msg) {
      if (typeof msg._comp == "undefined" || msg._comp == null) {
        throw "component " + node.id + " received invalid event. msg._comp is undefined or null";
      }
      if (typeof msg._comp.stack == "undefined" || msg._comp.stack == null) {
        throw "component " + node.id + " received invalid event. msg._comp.stack is undefined or null";
      }
      let stack = msg._comp.stack;
      let callerEvent = stack.pop(); // get the last entry, with an id matching this node's id
      if (callerEvent != EVENT_PREFIX + config.id) {
        throw "component " + node.id + " received invalid event. id does not match: " + callerEvent;
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
          node.status({fill:"green",shape:"ring",text: "running" });
        } else {
          // next entry on stack is for another caller, so we are done.
          node.send(msg);
          node.status({});
        }
      }
    }
    RED.events.on(EVENT_PREFIX + config.id, handler);

    // Clean up event handler on close
    this.on("close",function() {
        RED.events.removeListener(EVENT_PREFIX + config.id, handler);
        node.status({});
    });

    this.on("input", function(msg) {
      sendStartFlow(msg, node);
      node.status({fill:"green",shape:"ring",text: "running" });
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
        let paramSource = node.paramSources[paramName];
        let val = RED.util.evaluateNodeProperty(paramSource.source, paramSource.sourceType, node, msg);
        if (paramSource.required && (val == null || val == undefined)) {
          node.status({fill:"red",shape:"ring",text: "required: '" + paramSource.name + "'" });
          throw "component parameter '" + paramSource.name + "' is required, but no value found.";
        } 
        msg[paramSource.name] = val;
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


    this.on("input", function(msg) {

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
