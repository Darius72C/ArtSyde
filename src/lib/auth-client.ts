"use client";

import { createAuthClient } from "better-auth/react";

/** The browser side of the customer accounts (src/server/auth.ts): sign in, sign up, Google, session, sign out. */
export const authClient = createAuthClient();
