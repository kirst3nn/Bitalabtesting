import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isUserOrOrganizationSite = repositoryName?.endsWith(".github.io") ?? false;
const base =
  process.env.GITHUB_ACTIONS === "true" && repositoryName && !isUserOrOrganizationSite
    ? `/${repositoryName}/`
    : "/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    rollupOptions: {
      input: ["index.html", "privacy.html", "terms.html"],
    },
  },
});
