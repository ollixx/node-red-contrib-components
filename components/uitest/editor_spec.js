var puppeteer = require("puppeteer");
var http = require('http');
var express = require("express");
var RED = require("node-red");

let server;

describe('nested components in the admin UI', function () {

    before(function (done) {
        // Create an Express app
        const app = express();

        // Add a simple route for static content served from 'public'
        app.use("/", express.static("public"));

        // Create a server
        server = http.createServer(app);

        // Create the settings object - see default settings.js file for other options
        var settings = {
            httpAdminRoot: "/red",
            httpNodeRoot: "/api",
            userDir: __dirname,
            flowFile: "flows.json",
            functionGlobalContext: {}    // enables global context
        };

        // Initialise the runtime with a server and settings
        RED.init(server, settings);

        // Serve the editor UI from /red
        app.use(settings.httpAdminRoot, RED.httpAdmin);

        // Serve the http nodes UI from /api
        app.use(settings.httpNodeRoot, RED.httpNode);

        server.listen(8000);

        // Start the runtime
        RED.start();

        done();
    });

    after(function (done) {
        RED.stop();
        server.close();
        done();
    });

    it('should basically work', function (done) {
        (async () => {
            const browser = await puppeteer.launch({ defaultViewport: { width: 1280, height: 1024 } });
            const page = await browser.newPage();
            await page.goto("http://localhost:8000/red/");
            await page.waitForSelector("div .red-ui-tabs-search.red-ui-tab-button", { visible: true });
            await page.screenshot({ path: 'node-red-admin-ui.png' });

            // drag node
            let elm = await (await page.waitForSelector("[id='19eab3c2.0c8d8c']", { visible: true }));
            let bounding_box = await elm.boundingBox();
            let x = bounding_box.x + bounding_box.width / 2;
            let y = bounding_box.y + bounding_box.height / 2;
            await page.mouse.move(x, y);
            await page.mouse.down();
            await page.waitForTimeout(50);
            await page.mouse.move(x + 100, y, { steps: 10 });
            await page.waitForTimeout(50);
            await page.mouse.up();
            await page.waitForTimeout(50);

            await page.screenshot({ path: 'after-drag.png' });


            await page.mouse.down();
            await page.mouse.up();
            await page.mouse.down();
            await page.mouse.up();

            await page.screenshot({ path: 'after-click.png' });


            await browser.close();
            done();
        })()
    }).timeout(20000);
});