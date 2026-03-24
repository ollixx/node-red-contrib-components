const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
    testDir: __dirname,
    testMatch: "editor.spec.js",
    timeout: 30000,
    fullyParallel: false,
    reporter: [
        ["list"],
        ["html", { open: "never", outputFolder: "playwright-report" }]
    ],
    outputDir: "test-results",
    use: {
        baseURL: "http://127.0.0.1:18080/red/",
        headless: true,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure"
    }
});