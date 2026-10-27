'use client'

import { SessionProvider } from "next-auth/react"

// The header only needs "signed in?"; one session fetch per page load is enough.
export default function Providers({ children }) {
    return (
        <SessionProvider refetchOnWindowFocus={false}>
            {children}
        </SessionProvider>
    )
}
