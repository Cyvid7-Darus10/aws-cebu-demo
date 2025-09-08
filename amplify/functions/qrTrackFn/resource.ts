import { defineFunction } from "@aws-amplify/backend";

export const qrTrackFn = defineFunction({
  name: "qr-track-fn",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  environment: {
    QrItemsTableName: "QrItems",
    QrScansTableName: "QrScans",
  },
});
