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

export default backend;
