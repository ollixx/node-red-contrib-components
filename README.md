# node-red-contrib-components
Components are an alternative approach to create reusable node-red flows and are
very much inspired by [action flows](https://github.com/Steveorevo/node-red-contrib-actionflows/tree/master/actionflows).

Components allow a well defined API, that is configured in the ```component in```
node. The "API" allows a set of expected incoming message parts. Each of these parameters
can be configured using the following settings:

## parameter settings
#### name
the name of the message part that the flow expects.
#### type
the expected type of the message part. One of:

* any
* json
* string
* number
* boolean

#### required
if checked, the flow will throw an error, if the message part is not set (input value is null or undefined).


## features
* definition nodes (component_in and component return) to define a flow, that represents a resusable component.
* usage node (component) that uses / executes a component.

## ideas
* filter the incoming message, so certain parts are purged before executing the component
* hide well defined parts of the incoming message, so that the flow inside the component will not see or overwrite them. After the flow is left, the returned message will be reset such, that the initial parts are visible again.
* parameter setting "pass through". If set, the message part is hidden inside the component flow. Its initial value is overwritten by the value set in the caller node. After the return, the message part is restored with the initial, passed through value. The value is stored inside the ```_comp``` message part, that transports component meta data.
* parameter setting "purge". If set, the message part is removed before the message is returned to the caller node.
* parameter setting "validate". Opens a new line of extra settings for type specific validations (jsonata?)
* parameter setting "default". Set a default value both for optional and required parameters. 
* parameter setting "description". write a few infos about what the parameter does in the component.
* multiple output ports. When using more than one ```component_return``` node, the caller node automatically exposes each of them as a separate output port. This can be statically analysed by parsing the ```component_in``` node's wires.
* support more parameter types ( Buffer, ... )
* support json schema. Could be used as a new parameter type or for validation.
* have an optional second ouput port on the caller node, that is used on validation errors (e.g. required param missing).
* allow definition of outgoing message parts in ```component_out```. This might be an alternative to setting "purge" or "pass through" in ```component_in```. This could be seen as the outbound API, as it defines, what the following flows can expect to get passed in the msg coming from the component.

## todos
* write tests
* realize more ideas (see above)
* clean up code
* rethink the naming of the nodes (feedback is welcome)
* sample flows ( both as code and images in here)
* show target node's name by default in caller node's label
* use github actions to build the package, create releases and publish to npm

