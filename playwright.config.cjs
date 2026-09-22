const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:'./tests',timeout:90000,workers:2,reporter:'list',outputDir:'output/test-results',use:{baseURL:'http://127.0.0.1:4190',channel:'chrome',headless:true,trace:'off'},webServer:{command:'node scripts/preview-service-ctas.cjs',url:'http://127.0.0.1:4190',reuseExistingServer:true}});
