import DefaultTheme from "vitepress/theme";
import Layout from "./Layout.vue";
import Shot from "./Shot.vue";
import Diagram from "./Diagram.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }: { app: import("vue").App }) {
    app.component("Shot", Shot);
    app.component("Diagram", Diagram);
  },
};
