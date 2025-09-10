import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { qrGenerateFn } from "./functions/qrGenerateFn/resource.js";
import { qrTrackFn } from "./functions/qrTrackFn/resource.js";
import { storage } from "./storage/resource";

const backend = defineBackend({
  auth,
  data,
  storage,
  qrGenerateFn,
  qrTrackFn,
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
backend.data.grantAccess(backend.qrGenerateFn);
backend.data.grantAccess(backend.qrTrackFn);

export default backend;
