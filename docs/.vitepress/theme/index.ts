import DefaultTheme from "vitepress/theme";
import Demo from "./Demo.vue";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("Demo", Demo);
  },
};
