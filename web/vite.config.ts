import { defineConfig } from "vite";

export default defineConfig({
  // مسارات نسبية حتى يعمل الموقع على GitHub Pages أو أي مجلد فرعي
  base: "./",
  server: {
    // المحتوى (content/) خارج مجلد web، فنسمح لخادم التطوير بقراءته
    fs: { allow: [".."] },
  },
});
