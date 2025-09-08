import { defineFunction } from "@aws-amplify/backend";

export const qrGenerateFn = defineFunction({
  name: "qr-generate-fn",
  entry: "./handler.ts",
});
