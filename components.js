console.log("components here");

var log = function(node, message) {
  let m = "";
  if (node.type == "component") {
    m += "c";
  }
  if (node.type == "component_in") {
    m += "ci";
  }
  if (node.type == "component_out") {
    m += "co";
  }
  console.log(m + " " + node.id, message);
}

module.exports = function(RED) {

  const EVENT_PREFIX = "comp:";

  // first node: componet in
  RED.nodes.registerType("component_in", componentIn);
  function componentIn(config) {
    var node = this;

    // Create our node and event handler
    RED.nodes.createNode(this, config);
    var handler = function(msg) {
        let target = msg._comp ? msg._comp.target : undefined;
        if (target == node.id) {
          log(node, "in for me" + target);
          node.receive(msg);
        } else {
          log(node, "in NOT for me");
        }
    }
    RED.events.on(EVENT_PREFIX, handler);

    // Clean up event handler
    this.on("close",function() {
        RED.events.removeListener(event, handler);
    });

    this.on("input", function(msg) {
        log(node, "start flow ");
        this.send(msg);
    });

  }
  // second node: component (use a component)
  RED.nodes.registerType("component", component);
  function component(config) {
    var node = this;
    node.selected = config.selected;

    // Create our node and event handler
    RED.nodes.createNode(this, config);

    var handler = function(msg) {
      console.log("returning event", msg);
      if (typeof msg._comp == "undefined" || msg._comp == null) {
        throw new Exception("component " + node.id + " received invalid event. msg._comp is undefined or null");
      }
      if (typeof msg._comp.stack == "undefined" || msg._comp.stack == null) {
        throw new Exception("component " + node.id + " received invalid event. msg._comp.stack is undefined or null");
      }
      let stack = msg._comp.stack;
      let callerEvent = stack.pop(); // get the last entry, with an id matching this node's id
      if (callerEvent != EVENT_PREFIX + config.id) {
        throw new Exception("component " + node.id + " received invalid event. id does not match: " + callerEvent);
      }
      console.log("  stack now", msg._comp.stack.length);
      if (stack.length == 0) {
        // stack is empty, so we are done.
        delete msg._comp;
        log(node, "done with empty stack");
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
          log(node, "done with stack size " + stack.length);
          node.send(msg);
          node.status({});
        }
      }
    }
    RED.events.on(EVENT_PREFIX + config.id, handler);

    // Clean up event handler on close
    this.on("close",function() {
        RED.events.removeListener(event, handler);
        node.status({});
    });

    this.on("input", function(msg) {
      log(node, "in");

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
      msg._comp.target = node.selected;
      msg._comp.stack.push(event)
      log(node, "pushed stack " + msg._comp.stack.length);
      log(node, "send to " + node.selected);

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
      log(node, "in " + (typeof msg._comp));

      // create / update state for new execution
      if (typeof msg._comp != "undefined") {
        // peek into stack to know where to return:
        let callerEvent = msg._comp.stack.pop();
        msg._comp.stack.push(callerEvent);
        log(node, "sending return " + callerEvent);
        // send event
        RED.events.emit(callerEvent, msg);
      }

    });

  }

}; // end module.exports
