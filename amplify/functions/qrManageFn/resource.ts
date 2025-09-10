import { defineFunction } from "@aws-amplify/backend";

export const qrManageFn = defineFunction({
  name: "qr-manage-fn",
  entry: "./handler.ts",
});
