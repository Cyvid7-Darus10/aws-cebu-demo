"use client";

import { useRouter } from "next/navigation";
import { Authenticator, View } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main>
      <Authenticator>
        {({ user }) => {
          if (user) {
            router.replace("/");
          }
          return <View />;
        }}
      </Authenticator>
    </main>
  );
}
