import { defineBackend } from "@aws-amplify/backend";
import { defineStorage } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { qrGenerateFn } from "./functions/qrGenerateFn/resource.js";
import { qrTrackFn } from "./functions/qrTrackFn/resource.js";

// Define storage for QR images
const storage = defineStorage({
  name: "qrImages",
  access: (allow) => ({
    "qr-images/*": [
      allow.authenticated.to(["read", "write"]),
      allow.guest.to(["read"]),
    ],
  }),
});

const backend = defineBackend({
  auth,
  data,
  storage,
  qrGenerateFn,
  qrTrackFn,
});

// Environment variables and permissions are handled by Amplify Gen 2 automatically
// The functions will have access to the resources they're connected to via the data schema
