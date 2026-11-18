import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [["list"], ["html", {open:"never",outputFolder:"test-results/playwright-report"}]],
  use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry", screenshot:"only-on-failure" },
  projects: [
    { name:"desktop",use:{...devices["Desktop Chrome"],viewport:{width:1280,height:900}} },
    { name:"tablet", use:{...devices["Desktop Chrome"],viewport:{width:768,height:950}} },
    { name:"mobile", use:{...devices["Desktop Chrome"],viewport:{width:390,height:844}} },
  ],
  webServer: { command:"npm run dev -- --hostname 127.0.0.1", url:"http://127.0.0.1:3000", reuseExistingServer:!process.env.CI,timeout:120_000 },
});
