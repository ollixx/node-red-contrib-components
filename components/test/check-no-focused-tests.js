const fs = require("fs");
const path = require("path");

const testDir = __dirname;
const focusedPattern = /\b(?:it|describe)\.only\s*\(/;
const offendingFiles = [];

for (const entry of fs.readdirSync(testDir)) {
    if (!entry.endsWith("_spec.js")) {
        continue;
    }

    const filePath = path.join(testDir, entry);
    const content = fs.readFileSync(filePath, "utf8");
    if (focusedPattern.test(content)) {
        offendingFiles.push(path.relative(process.cwd(), filePath));
    }
}

if (offendingFiles.length > 0) {
    console.error("Focused tests are not allowed:");
    offendingFiles.forEach((filePath) => console.error("- " + filePath));
    process.exit(1);
}