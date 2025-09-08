"use client";

import { PropsWithChildren } from "react";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";

Amplify.configure(outputs);

export function AmplifyProvider({ children }: PropsWithChildren) {
  return children;
}
