import DefaultTheme from "vitepress/theme";
import Flow from "./Flow.vue";
import Layout from "./Layout.vue";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("Flow", Flow);
  },
};
