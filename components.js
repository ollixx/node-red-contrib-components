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
    this.selected = config.selected;
    this.on("input", function(msg) {
      msg.selected = this.selected;
      this.send(msg);
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
