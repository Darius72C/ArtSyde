import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

// Better Auth's endpoints: sign in / up, Google's return, session, sign out.
export const { GET, POST } = toNextJsHandler(auth);
