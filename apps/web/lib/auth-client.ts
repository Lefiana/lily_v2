import { createAuthClient } from "better-auth/react"

// Explicitly typing the client as the return type of createAuthClient
// fixes the "not portable" inference error.
export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
    baseURL: "http://localhost:3001", // Your NestJS backend URL
    basePath: "/api/auth", // The base path where Better Auth is mounted
})

// export const { signIn, signUp, signOut, useSession } = authClient;