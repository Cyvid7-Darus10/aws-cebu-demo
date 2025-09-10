import { defineFunction } from "@aws-amplify/backend";

export const qrGenerateFn = defineFunction({
  name: "qr-generate-fn",
  entry: "./handler.ts",
  environment: {
    BASE_URL: "https://main.d2uj1ffub6eiln.amplifyapp.com",
  },
});
