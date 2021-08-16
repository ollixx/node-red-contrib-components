# node-red-contrib-components
Components are an alternative approach to create reusable node-red flows and are
very much inspired by [action flows](https://github.com/Steveorevo/node-red-contrib-actionflows/tree/master/actionflows).

![Components](/images/components.png)

## Motivation
I love node-red and I try do solve mostly every programmable problem with it. Some projects can get 
really complicated and having 20 tabs with hundreds of nodes needs some more structure. Components always
have been in my head, despite subflows doing their job really well. But the later tend to be more cumbersome and less flexible.
[Action flows](https://github.com/Steveorevo/node-red-contrib-actionflows/tree/master/actionflows) are another very nice 
approach to encapsulate (business) logic and make it reusable. But their definition of an API is not mine. 
So here it is: The first prototype of an advanced set of nodes, that will hopefully help
node-red junkies like me to organize their flows.

* Components encapsulate well defined logic and tasks in a way that let's you keep track of what it is doing.
* Components are a very compact way to prepare the ```msg```, pass it to a "black box" flow and get it back with just
the parts you need.
* Components make their API truly visible in that they define a set of msg parts, that are expected or optional. The 
calling node can prepare all the input parts just in one nice list, that is derived from the component's parameters.
* In a way, Components break the law of narrow focused nodes, since they are rather generic and target a broader usage.
I can live with that, and I hope many of you node-red enthusiasts enjoy them, too.

## The Nodes
### component_in - Start of a Component flow
![Component input node](/images/component_in.png)

This input node is the starting point of an reusable flow. It allows to set a list of parameters, that it expects.
Every parameter is defined by its name, a type and a flag to define it as required or optional. This list of parameters can be seen as the API of the component.

### component_out - End of the flow
![Component output node](/images/component_out.png)

This node returns the ```msg``` to the calling node and supports nested components. 

If it receives a message, that is not created by a calling compontent node, the message is broadcast to all possible callers, i.e. all component nodes, that use the return node's flow.

A component flow can have more than one return node. For each of them, the calling component node optionally features a separate output port labeled with the name of the return node. By default, a return node will send its message to one "default" output port.

In versions to come, it will
also allow to set some options like purging unwanted or temporary parts from the final ```msg```.

### component - the calling node

![Component caller node](/images/component.png)

To use a prepared Component, this node is setup. It must be configured in accordance with the Component's parameter list, so
that at least all required ```msg``` parts are connected to either of the known options also presented in the honorable change node:
* parts in msg, flow context, global context
* constants of types boolean, number, string, timestamp, Buffer and json
* jsonata or regular expressions
* environment variables
* other nodes

Until now only required parameters are validated against null, undefined and empty string. More validation and other features are to come.

### Install
node-red-contrib-components can be install using the node-red editor's pallete or by running npm in the console:

``` bash
npm install node-red-contrib-components
```

### Examples
I am still working on publishing more example flows to accelerate getting Components to work. It's on my todo list (see below).

## Implemented features
* definition nodes (component_in and component return) to define a flow, that represents a resusable component.
* usage node (component) that uses / executes a component.
* configure an API like list of parameters the flow expects.
* configure the calling node to fulfill the API by passing in matching values
* validate required parameters
* i18n (US and german only - feel free to PR you favourite language)
* Some rudimentary unit tests
* multiple output ports. When using more than one ```component_return``` node, the caller node automatically exposes each of them as a separate output port. This can be statically analysed by parsing the ```component_in``` node's wires. The ```component_return``` node has a new property "Output Ports", that can be set to "separate" or "default". In the later case, the "default" output port is used (for all return nodes on "default")
* fix layout in parameter lists, both in definition and caller nodes.
* use github actions to build the package, create releases and publish to npm
* Allow to set the status in the ```component``` node. See: https://github.com/ollixx/node-red-contrib-components/issues/1
* Validate incoming message parts in the ```component``` node. Use the types defined in the API to validate the message parts. See https://github.com/ollixx/node-red-contrib-components/issues/2
* ```component_return``` node handles events/messages that do not come from their matching ```component_in``` node. The message is brodacast to all ```component``` nodes, that call (and now react to) the flow.

## Ideas, not yet done
* filter the incoming message, so certain parts are purged before executing the component
* hide well defined parts of the incoming message, so that the flow inside the component will not see or overwrite them. After the flow is left, the returned message will be reset such, that the initial parts are visible again.
* parameter setting "pass through". If set, the message part is hidden inside the component flow. Its initial value is overwritten by the value set in the caller node. After the return, the message part is restored with the initial, passed through value. The value is stored inside the ```_comp``` message part, that transports component meta data.
* parameter setting "purge". If set, the message part is removed before the message is returned to the caller node.
* parameter setting "validate". Opens a new line of extra settings for type specific validations (jsonata?)
* parameter setting "default". Set a default value both for optional and required parameters. 
* parameter setting "description". write a few infos about what the parameter does in the component.
* support more parameter types ( Buffer, ... )
* support json schema. Could be used as a new parameter type or for validation.
* have an optional second ouput port on the caller node, that is used on validation errors (e.g. required param missing).
* allow definition of outgoing message parts in ```component_out```. This might be an alternative to setting "purge" or "pass through" in ```component_in```. This could be seen as the outbound API, as it defines, what the following flows can expect to get passed in the msg coming from the component.
* use ```enum``` as another possible type for parameters. The enumeration values would have to be defined either in an editable list, an array of strings (either pasted in the parameter editor or set by editableType field) or an object (keys would be the enum values, but would allow to access a structured object for each enum value).

## todos - things identified to be done
* write more tests
* realize more ideas (see above)
* clean up code
* rethink the naming of the nodes (feedback is welcome)
* sample flows ( both as code and images in here) / examples
* create Change logs for another release (automatically in workflow)
