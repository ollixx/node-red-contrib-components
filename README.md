# node-red-contrib-components
Components are an alternative approach to create reusable node-red flows and are
very much inspired by [action flows]
(https://github.com/Steveorevo/node-red-contrib-actionflows/tree/master/actionflows).

Components allow a well defined API, that is configured in the ```component in```
node. The "API" allows a set of expected incoming message parts. Each of these parameters
can be configured using a variaty of settings like defaults, validation (required etc.),
a description and more (see ideas).

## features
* definition nodes (component in and component return) to define a flows
* usage node (component) that uses / executes a component.

## ideas
* API - filter the incoming message, so certain parts are purged before executing the component
* API - hide well defined parts of the incoming message, so that the flow inside the component will not see or overwrite them. After the flow is left, the returned message will be reset such, that the initial parts are visible again.
