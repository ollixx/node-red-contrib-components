# node-red-contrib-components
Components are an alternative approach to create reusable node-red flows and are
very much inspired by [action flows](https://github.com/Steveorevo/node-red-contrib-actionflows/tree/master/actionflows).

![Components](/images/components.png)

## Motivation
Some projects can get really complicated and having 20 tabs with hundreds of nodes needs some more structure. Components always
have been in my head, despite subflows doing their job really well. But the later tend to be more cumbersome and less flexible.
[Action flows](https://github.com/Steveorevo/node-red-contrib-actionflows/tree/master/actionflows) are another very nice 
approach to encapsulate (business) logic and make it reusable. But their definition of an API is not mine. 
So here it is: An advanced set of nodes, that will hopefully help you to organize your flows.

* Components encapsulate well defined logic and tasks in a way that let's you keep track of what it is doing.
* Define once, use many times
* Components are a very compact way to prepare the ```msg```, pass it to a "black box" flow and get it back with just
the parts you need.
* Components make their API truly visible in that they define a set of msg parts, that are expected or optional. The 
calling node can prepare all the input parts just in one nice list, that is derived from the component's parameters.

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

Until now only required parameters are validated against null, undefined and empty string. More validation is one the todo list.

### Install
node-red-contrib-components can be install using the node-red editor's pallete or by running npm in the console:

``` bash
npm install node-red-contrib-components
```

### Examples
There are some examples available now in the node-red specific way. Just select import... in the menu and find ```node-red-contrib-components``` in the exmaples sections. Beside some basic flows, that show how to use components, there are some more advanced scenarios to show speecific features like broadcast, in-only etc. Check it out.

#### Cut/Copy/Paste component nodes
At the moment only ```use comp``` can be copy/pasted wihtout problems.
Cut/Copy/Pasting component flows, i.e. ```comp start``` and ```comp return``` nodes together with any linked ```use comp``` nodes will not preserve the association between them. 
There is a work around to move (not copy) components together with their ```use comp``` nodes: Export the set of nodes, remove them from NR and re-import them at the new tab.
At least the Cut/Paste behaviour will probably be fixed in one of the next releases.

### Component features in detail
* multiple output ports. 
  
  When using more than one ```component_return``` node, the caller node automatically exposes each of them as a separate output port. This can be statically analysed by parsing the ```component_in``` node's wires. The ```component_return``` node has a new property "Output Ports", that can be set to "separate" or "default". In the later case, the "default" output port is used (for all return nodes on "default")
* Allow to set the status in the ```component``` node. See: https://github.com/ollixx/node-red-contrib-components/issues/1
* Validate incoming message parts in the ```component``` node. Use the types defined in the API to validate the message parts. See https://github.com/ollixx/node-red-contrib-components/issues/2
* Context Message Part & local/global parameters

  Each component flow exposes a special `msg.component` part, that contains all local parameters. By default, all parameters are local. There is an option in the API to change a parameter to be "global". In that case it will be put into the `msg`directly and stay there, even when the flow is left.
  
  `msg.component` has another part embedded, `msg.component._parent` if the current flow is nested inside another. That supports a stack for nesting and resursive flows.

## Ideas
* filter the incoming message, so certain parts are purged before executing the component
* parameter setting "pass through". If set, the message part is hidden inside the component flow. Its initial value is overwritten by the value set in the caller node. After the return, the message part is restored with the initial, passed through value. The value is stored inside the ```_comp``` message part, that transports component meta data. (Maybe outdate with `msg.component`?)
* parameter setting "purge". If set, the message part is removed before the message is returned to the caller node. (maybe outdated by `msg.component`).
* parameter setting "validate". Opens a new line of extra settings for type specific validations (jsonata?)
* parameter setting "default". Set a default value both for optional and required parameters. 
* parameter setting "description". write a few infos about what the parameter does in the component.
* top level description. Some more words about the purpose of the whole component.
* support more parameter types ( Buffer, ... )
* support json schema. Could be used as a new parameter type or for validation.
* have an optional, additional ouput port on the caller node, that is used on validation errors (e.g. required param missing).
* allow definition of outgoing message parts in ```component_out```. This might be an alternative to setting "purge" or "pass through" in ```component_in```. This could be seen as the outbound API, as it defines, what the following flows can expect to get passed in the msg coming from the component.
* use ```enum``` as another possible type for parameters. The enumeration values would have to be defined either in an editable list, an array of strings (either pasted in the parameter editor or set by editableType field) or an object (keys would be the enum values, but would allow to access a structured object for each enum value).
