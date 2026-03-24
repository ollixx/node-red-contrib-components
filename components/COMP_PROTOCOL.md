# _comp protocol

The runtime nodes exchange component call state through msg._comp.

## Shape

- target: transient id of the component_in node that should start next
- stack: call stack for nested component execution
- returnNode: metadata for the active component_out return path

## Stack entries

Each stack entry has this shape:

- callerId: id of the component node that must receive the return event
- targetId: id of the component_in node that was entered
- context: optional stored local component context

## Lifecycle

1. run-component creates msg._comp if needed and pushes a stack entry before emitting the start event.
2. component-start consumes target and either forwards into the component flow or immediately emits a return event when no component_out is reachable.
3. component-return writes returnNode and emits the return event for either the top stack caller or every matching caller in broadcast mode.
4. run-component pops the stack on return, restores parent context, clears returnNode and removes msg._comp when the stack becomes empty.

## Invariants

- stack must be a non-empty array before a return event is handled
- target is only meaningful before component-start receives the event
- returnNode is transient and cleared by run-component after handling