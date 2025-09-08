import { defineFunction } from "@aws-amplify/backend";

export const qrTrackFn = defineFunction({
  name: "qr-track-fn",
  entry: "./handler.ts",
});
