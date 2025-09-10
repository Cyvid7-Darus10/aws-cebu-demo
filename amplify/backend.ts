import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { qrGenerateFn } from "./functions/qrGenerateFn/resource.js";
import { storage } from "./storage/resource";

const backend = defineBackend({
  auth,
  data,
  storage,
  qrGenerateFn,
});

// Grant the Lambda function access to the storage bucket
backend.qrGenerateFn.addEnvironment(
  "AMPLIFY_STORAGE_BUCKET_NAME",
  backend.storage.resources.bucket.bucketName
);

// Add configurable base URL for QR tracking URLs
backend.qrGenerateFn.addEnvironment(
  "BASE_URL",
  process.env.BASE_URL || "https://main.d2uj1ffub6eiln.amplifyapp.com"
);

backend.storage.resources.bucket.grantReadWrite(
  backend.qrGenerateFn.resources.lambda
);

// Lambda only needs S3 access, database operations are handled client-side

export default backend;
