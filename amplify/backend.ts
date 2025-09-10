import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { qrGenerateFn } from "./functions/qrGenerateFn/resource.js";
import { qrTrackFn } from "./functions/qrTrackFn/resource.js";
import { qrManageFn } from "./functions/qrManageFn/resource.js";
import { storage } from "./storage/resource";

const backend = defineBackend({
  auth,
  data,
  storage,
  qrGenerateFn,
  qrTrackFn,
  qrManageFn,
});

// Grant the Lambda function access to the storage bucket
backend.qrGenerateFn.addEnvironment(
  "AMPLIFY_STORAGE_BUCKET_NAME",
  backend.storage.resources.bucket.bucketName
);
backend.storage.resources.bucket.grantReadWrite(
  backend.qrGenerateFn.resources.lambda
);

// Grant the Lambda functions access to the data resources
backend.data.addDatabaseAccess(backend.qrGenerateFn);
backend.data.addDatabaseAccess(backend.qrTrackFn);
backend.data.addDatabaseAccess(backend.qrManageFn);

export default backend;
