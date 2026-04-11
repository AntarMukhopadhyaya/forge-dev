import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Forge",
  description: "Define your stack once. Reuse it everywhere.",
  base: "/forge-dev/",
  cleanUrls: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Getting Started", link: "/getting-started" },
      { text: "Commands", link: "/commands" },
      { text: "Presets", link: "/presets" },
      { text: "Custom Presets", link: "/custom-presets" },
      { text: "Examples", link: "/examples" },
    ],

    sidebar: [
      {
        text: "Documentation",
        items: [
          { text: "Getting Started", link: "/getting-started" },
          { text: "Commands", link: "/commands" },
          { text: "Presets", link: "/presets" },
          { text: "Custom Presets", link: "/custom-presets" },
          { text: "Examples", link: "/examples" },
        ],
      },
    ],

    outline: {
      level: [2, 3],
      label: "On this page",
    },

    docFooter: {
      prev: "Previous",
      next: "Next",
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/AntarMukhopadhyaya/forge-dev" },
    ],
  },
});
