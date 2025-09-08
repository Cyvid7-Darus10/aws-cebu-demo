import { defineFunction } from "@aws-amplify/backend";

export const qrGenerateFn = defineFunction({
  name: "qr-generate-fn",
  entry: "./handler.ts",
  environment: {
    AMPLIFY_STORAGE_BUCKET_NAME: "qr-images",
    BASE_URL: "https://main.d2uj1ffub6eiln.amplifyapp.com",
  },
});
