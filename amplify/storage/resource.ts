import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "qrImages",
  access: (allow) => ({
    "qr-images/*": [
      allow.authenticated.to(["read", "write"]),
      allow.guest.to(["read"]),
    ],
  }),
});
