
// auth.ts
import { BetterAuthOptions } from 'better-auth';

const isProd = process.env.NODE_ENV === 'production';

export const authConfig = {
    // We leave 'database' out here because it's injected in the module
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },
    advanced:{
        cookies:{
            sessionToken:{
                name: "better-auth.session_token",
                attributes: {
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: "lax",
                    httpOnly: true,
                }
            }
        }
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
    },
    basePath: '/api/auth',
    baseURL: process.env.BACKEND_URL || 'http://localhost:3001',
    trustedOrigins: [
        'http://localhost:3000',
        'http://localhost:3001',
    ],
} satisfies BetterAuthOptions;