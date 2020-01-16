console.log("components here");

module.exports = function(RED) {

  // first node: componet in
  RED.nodes.registerType("component_in", componentIn);
  function componentIn(config) {
    var node = this;

    // Create our node and event handler
    RED.nodes.createNode(this, config);
    this.on("input", function(msg) {
        this.send(msg);
    });

  }
  // second node: component (use a component)
  RED.nodes.registerType("component", component);
  function component(config) {
    var node = this;

    // Create our node and event handler
    RED.nodes.createNode(this, config);
    this.counter = config.counter;
    console.log("initial counter: " + node.counter);
    this.on("input", function(msg) {
        if (msg.payload) {
          node.counter = msg.payload;
        }
        msg.counter = node.counter;
        this.send(msg);
        console.log("got new counter: " + node.counter);
    });

  }

  // third node: component out
  RED.nodes.registerType("component_out", componentOut);
  function componentOut(config) {
    var node = this;

    // Create our node and event handler
    RED.nodes.createNode(this, config);

  }

}; // end module.exports
