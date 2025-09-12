import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { qrGenerateFn } from "../functions/qrGenerateFn/resource";

const schema = a.schema({
  QrItems: a
    .model({
      id: a.id().required(),
      targetUrl: a.string().required(),
      s3Key: a.string().required(),
      ownerSub: a.string(),
      createdAt: a.datetime().required(),
      lastScanAt: a.datetime(),
      scanCount: a.integer().default(0),
    })
    .authorization((allow) => [allow.publicApiKey(), allow.owner()])
    .secondaryIndexes((index) => [index("targetUrl").name("byTargetUrl")]),

  QrScans: a
    .model({
      qrId: a.string().required(),
      scanAt: a.datetime().required(),
      ua: a.string(),
      referer: a.string(),
      ip: a.string(),
      country: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [
      index("qrId").sortKeys(["scanAt"]).name("byQrId"),
    ]),

  uploadQrImage: a
    .query()
    .arguments({
      targetUrl: a.string().required(),
      qrId: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(qrGenerateFn)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
