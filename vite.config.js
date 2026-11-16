const { defineConfig } = require('vite'); const react = require('@vitejs/plugin-react'); const tailwindcss = require('@tailwindcss/vite').default;
module.exports = defineConfig({ plugins:[react(),tailwindcss()], server:{host:'127.0.0.1',port:5173,proxy:{'/api':'http://127.0.0.1:3001'}}, build:{outDir:'dist'}, test:{globals:true} });
