const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:'./tests/browser',timeout:60000,workers:1,reporter:'list',outputDir:'output/playwright/results',use:{baseURL:'http://127.0.0.1:4180',channel:'chrome',headless:true,trace:'retain-on-failure'},webServer:{command:'node scripts/preview.cjs',url:'http://127.0.0.1:4180',reuseExistingServer:true,timeout:15000}});
