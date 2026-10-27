'use client'

import { signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { resendVerificationEmail } from "../actions/auth"
import styles from "./page.module.css"

const AUTH_ERROR_MESSAGES = {
    TooManyRequests: "Too many sign-in link requests. Try again later.",
    Verification: "That sign-in link is invalid or has expired. Request a new one.",
}

/** Only same-origin paths are allowed as post-login destinations. */
function safeRedirectPath(value, origin) {
    if (typeof value !== "string" || !value) return "/"
    try {
        const target = new URL(value, origin)
        if (target.origin !== origin) return "/"
        return `${target.pathname}${target.search}${target.hash}`
    } catch {
        return "/"
    }
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase()
}

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [error, setError] = useState("")
    const [actionNotice, setActionNotice] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isResendingVerification, setIsResendingVerification] = useState(false)
    const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin
    const redirectTo = safeRedirectPath(searchParams.get("redirect") || searchParams.get("callbackUrl"), origin)
    const authError = searchParams.get("error")
    const displayedError = error || (authError ? AUTH_ERROR_MESSAGES[authError] || "Sign-in failed. Try again." : "")
    const notice = actionNotice || (
        searchParams.get("verified") === "true"
            ? "Your email is verified. You can sign in now."
            : searchParams.get("registered") === "true"
                ? "Check your inbox for a link to verify your email, then sign in."
                : searchParams.get("verification") === "invalid"
                    ? "That verification link is invalid or expired. Request a new one below."
                    : ""
    )
    const canResendVerification = Boolean(error) ||
        searchParams.get("registered") === "true" ||
        searchParams.get("verification") === "invalid"

    const handleResendVerification = async (e) => {
        e.preventDefault()
        setIsResendingVerification(true)
        const result = await resendVerificationEmail(new FormData(e.currentTarget))
        setActionNotice(result.message)
        setIsResendingVerification(false)
    }

    const handleMagicLink = async (formData) => {
        setError("")
        setIsLoading(true)
        try {
            await signIn("resend", { email: normalizeEmail(formData.get("email")), redirectTo })
        } catch {
            setError("The sign-in link could not be sent. Try again.")
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setActionNotice("")
        setIsLoading(true)

        const form = e.currentTarget
        try {
            const result = await signIn("credentials", {
                email: normalizeEmail(form.email.value),
                password: form.password.value,
                redirect: false,
            })

            if (result?.error) {
                setError("Wrong email or password, or the email is not verified yet.")
                setIsLoading(false)
            } else {
                router.push(redirectTo)
                router.refresh()
            }
        } catch {
            setError("Sign-in failed. Try again.")
            setIsLoading(false)
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.panel}>
                <h1 className={styles.title}>Sign in</h1>
                <p className={styles.intro}>
                    An account is only needed for Pit Lane Pro. Everything else, including favourite drivers,
                    works without one.
                </p>

                {displayedError && (
                    <p className={styles.error} role="alert">{displayedError}</p>
                )}

                {notice && <p className={styles.notice} role="status">{notice}</p>}

                <form action={handleMagicLink} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor="link-email" className={styles.label}>Email</label>
                        <input
                            id="link-email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <button type="submit" disabled={isLoading} className="btn btn-primary">
                        {isLoading ? "Sending…" : "Email me a sign-in link"}
                    </button>
                </form>

                <p className={styles.divider}><span>or use a password</span></p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor="password-email" className={styles.label}>Email</label>
                        <input
                            id="password-email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="password" className={styles.label}>Password</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    <button type="submit" disabled={isLoading} className="btn btn-secondary">
                        {isLoading ? "Signing in…" : "Sign in with password"}
                    </button>
                </form>

                {canResendVerification && (
                    <form onSubmit={handleResendVerification} className={`${styles.form} ${styles.resend}`}>
                        <div className={styles.field}>
                            <label htmlFor="resend-email" className={styles.label}>Resend verification email</label>
                            <input
                                id="resend-email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                required
                                disabled={isResendingVerification}
                            />
                        </div>
                        <button type="submit" disabled={isResendingVerification} className="btn btn-secondary">
                            {isResendingVerification ? "Sending…" : "Resend email"}
                        </button>
                    </form>
                )}

                <p className={styles.switch}>
                    No account? <Link href="/signup">Create one</Link>
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginForm />
        </Suspense>
    )
}
