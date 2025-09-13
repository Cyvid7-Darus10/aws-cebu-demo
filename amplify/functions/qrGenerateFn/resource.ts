import { defineFunction, secret } from "@aws-amplify/backend";

export const qrGenerateFn = defineFunction({
  name: "qr-generate-fn",
  entry: "./handler.ts",
  environment: {
    BASE_URL: secret("BASE_URL"),
  },
});
