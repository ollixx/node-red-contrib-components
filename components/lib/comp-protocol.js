function ensureComponentState(msg) {
    if (typeof msg._comp === "undefined") {
        msg._comp = { stack: [] };
    } else if (!Array.isArray(msg._comp.stack)) {
        msg._comp.stack = [];
    }
    return msg._comp;
}

function setTarget(msg, targetId) {
    ensureComponentState(msg).target = targetId;
}

function clearTarget(msg) {
    if (msg._comp) {
        delete msg._comp.target;
    }
}

function createStackEntry(callerId, targetId, context) {
    const entry = { callerId: callerId, targetId: targetId };
    if (typeof context !== "undefined") {
        entry.context = context;
    }
    return entry;
}

function pushStackEntry(msg, entry) {
    ensureComponentState(msg).stack.push(entry);
    return entry;
}

function hasValidStack(msg) {
    return !!(msg._comp && Array.isArray(msg._comp.stack) && msg._comp.stack.length > 0);
}

function peekStackEntry(msg) {
    if (!hasValidStack(msg)) {
        return null;
    }
    return msg._comp.stack[msg._comp.stack.length - 1];
}

function popStackEntry(msg) {
    if (!hasValidStack(msg)) {
        return null;
    }
    return msg._comp.stack.pop();
}

function setReturnNode(msg, returnNode) {
    ensureComponentState(msg).returnNode = returnNode;
}

function clearReturnNode(msg) {
    if (msg._comp) {
        delete msg._comp.returnNode;
    }
}

function clearComponentState(msg) {
    delete msg._comp;
}

function restoreParentContext(msg, currentEntry, parentEntry) {
    if (parentEntry) {
        msg.component = parentEntry.context;
        return;
    }

    if (currentEntry && currentEntry.context && currentEntry.context._parent) {
        msg.component = currentEntry.context._parent;
        return;
    }

    delete msg.component;
}

module.exports = {
    clearComponentState,
    clearReturnNode,
    clearTarget,
    createStackEntry,
    ensureComponentState,
    hasValidStack,
    peekStackEntry,
    popStackEntry,
    pushStackEntry,
    restoreParentContext,
    setReturnNode,
    setTarget
};