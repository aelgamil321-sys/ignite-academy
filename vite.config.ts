import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
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