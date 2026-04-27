const { test, expect } = require("@playwright/test");
const express = require("express");
const http = require("http");
const RED = require("node-red");

const PORT = 18080;
const BASE_URL = `http://127.0.0.1:${PORT}/red/`;

let server;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
    const app = express();
    const settings = {
        uiPort: PORT,
        httpAdminRoot: "/red",
        httpNodeRoot: "/api",
        userDir: __dirname,
        flowFile: "flows.json",
        credentialSecret: "playwright-test-secret",
        functionGlobalContext: {},
        telemetry: {
            enabled: false,
            updateNotification: false
        },
        editorTheme: {
            tours: false
        }
    };

    server = http.createServer(app);
    RED.init(server, settings);
    app.use(settings.httpAdminRoot, RED.httpAdmin);
    app.use(settings.httpNodeRoot, RED.httpNode);

    await new Promise((resolve) => {
        server.listen(PORT, "127.0.0.1", resolve);
    });

    await RED.start();
});

test.afterAll(async () => {
    await RED.stop();
    await new Promise((resolve) => {
        server.close(resolve);
    });
});

async function dismissStartupDialogs(page) {
    const dialogButtons = [
        page.locator("button:has-text('No, do not enable notifications')"),
        page.locator("button:has-text('Close')")
    ];

    for (const button of dialogButtons) {
        try {
            await button.waitFor({ state: "visible", timeout: 2000 });
            await button.click();
            await page.locator(".red-ui-shade").waitFor({ state: "hidden", timeout: 5000 });
        } catch {
        }
    }
}

async function openEditor(page) {
    await page.goto(BASE_URL);
    await dismissStartupDialogs(page);
    await page.evaluate(() => {
        RED.workspaces.show("pw_tab");
    });
    await page.waitForFunction(() => RED.workspaces.active() === "pw_tab");
}

async function openNodeEditor(page, nodeId) {
    await page.evaluate((id) => {
        const node = RED.nodes.node(id);
        RED.view.reveal(id);
        RED.view.select(id);
        RED.editor.edit(node);
    }, nodeId);
    await expect(page.locator("#node-dialog-ok")).toBeVisible();
}

async function closeNodeEditor(page, save) {
    await page.locator(save ? "#node-dialog-ok" : "#node-dialog-cancel").click();
    await expect(page.locator("#node-dialog-ok")).toBeHidden();
}

test("renders component parameters after selecting a target component", async ({ page }) => {
    await openEditor(page);
    await openNodeEditor(page, "pw_run_choose");

    await page.selectOption("#node-input-selected", "pw_target");

    const parameterNames = page.locator("#node-input-parameter-container .node-input-property-name");
    await expect(parameterNames).toHaveCount(2);
    await expect(parameterNames.nth(0)).toHaveText("requiredName");
    await expect(parameterNames.nth(1)).toHaveText("optionalCount");

    await closeNodeEditor(page, false);
});

test("shows stale target feedback without opening the browser console", async ({ page }) => {
    await openEditor(page);
    await openNodeEditor(page, "pw_run_missing");

    await expect(page.locator("#component-validation-alert")).toBeVisible();
    await expect(page.locator("#component-validation-alert-text")).toContainText("invalidTargetComponent");

    await closeNodeEditor(page, false);
});

test("warns when return node mode changes invalidate runner output labels", async ({ page }) => {
    await openEditor(page);
    await openNodeEditor(page, "pw_ret_separate");

    await page.selectOption("#node-input-mode", "default");
    await closeNodeEditor(page, true);

    await openNodeEditor(page, "pw_run_valid");

    await expect(page.locator("#output-alert")).toBeVisible();
    await expect(page.locator("#output-alert")).toContainText("Output ports have changed");

    await closeNodeEditor(page, false);
});

test("keeps explicit local flags unchecked when reopening a component start", async ({ page }) => {
    await openEditor(page);
    await openNodeEditor(page, "pw_local_flags");

    const localCheckboxes = page.locator(".node-input-property-contextoption");
    await expect(localCheckboxes).toHaveCount(2);
    await expect(localCheckboxes.nth(0)).not.toBeChecked();
    await expect(localCheckboxes.nth(1)).not.toBeChecked();

    await closeNodeEditor(page, false);
});

test("component_out connected through a junction shows no notConnected annotation", async ({ page }) => {
    await openEditor(page);

    // Wait for the viewRedrawNode hook to have run for all nodes on the tab.
    // The hook fires synchronously during the first render pass; waitForFunction
    // polls until the node's valid flag is settled.
    await page.waitForFunction(() => {
        const node = RED.nodes.node("pw_junction_ret");
        return node !== null && node !== undefined;
    });

    // The node must be valid – no notConnected validation error
    const isValid = await page.evaluate(() => {
        const node = RED.nodes.node("pw_junction_ret");
        return node.valid !== false &&
               (!Array.isArray(node.validationErrors) || node.validationErrors.length === 0);
    });
    expect(isValid).toBe(true);

    // Opening the editor must not show the validation alert either
    await openNodeEditor(page, "pw_junction_ret");
    await expect(page.locator("#component-return-validation-alert")).toBeHidden();
    await closeNodeEditor(page, false);
});