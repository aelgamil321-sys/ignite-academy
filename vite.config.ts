import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  envPrefix: ["VITE_", "ENABLE_"],
  nitro: {
    hooks: {
      compiled: async () => {
        const { patchSecondaryStageAsset } = await import(
          "./scripts/patch-secondary-stage-asset.mjs"
        );
        patchSecondaryStageAsset();
      },
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});