module.exports = {
  componentIn: function componentIn(config) {
    var node = this;

    // Create our node and event handler
    RED.nodes.createNode(this, config);
    this.on("input", function(msg) {
        this.send(msg);
    });

  }
}
