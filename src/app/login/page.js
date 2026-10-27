'use client'

import { signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { safeRedirectPath } from "@/lib/validation"
import { resendVerificationEmail } from "../actions/auth"
import styles from "./page.module.css"

const AUTH_ERROR_MESSAGES = {
    TooManyRequests: "Too many sign-in link requests. Please try again later.",
    Verification: "That sign-in link is invalid or has expired. Request a new one.",
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
    const displayedError = error || (authError ? AUTH_ERROR_MESSAGES[authError] || "Sign-in failed. Please try again." : "")
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
            setError("Failed to send magic link. Please try again.")
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
                setError("Invalid email or password, or your email is not verified yet.")
                setIsLoading(false)
            } else {
                router.push(redirectTo)
                router.refresh()
            }
        } catch {
            setError("Something went wrong. Please try again.")
            setIsLoading(false)
        }
    }

    return (
        <div className={styles.container}>
            {/* Background Effects */}
            <div className={styles['bg-gradient']}></div>
            <div className={styles['glow-orb-1']}></div>
            <div className={styles['glow-orb-2']}></div>

            <div className={styles.content}>
                {/* Logo Area */}
                <div className={styles.logo}>
                    <Link href="/" style={{ textDecoration: 'none' }}>
                        <span className={styles['logo-icon']}>🏎️</span>
                        <div className={styles['logo-text']}>
                            <span>PIT LANE</span>
                            <span className={styles['logo-highlight']}>HUB</span>
                        </div>
                    </Link>
                </div>

                {/* Card */}
                <div className={styles.card}>
                    <h1 className={styles.title}>Welcome Back</h1>
                    <p className={styles.subtitle}>Sign in to access premium F1 data</p>

                    {displayedError && (
                        <div className={styles.error} role="alert">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {displayedError}
                        </div>
                    )}

                    {notice && <div className={styles.success} role="status">{notice}</div>}

                    {/* Magic Link Form */}
                    <div className={styles.magicLinkSection}>
                        <form action={handleMagicLink}>
                            <div className={styles['form-group']}>
                                <label className={styles.label}>Sign in with Email (Magic Link)</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="name@example.com"
                                        className={styles.input}
                                        required
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className={styles['submit-btn']}
                                        style={{ width: 'auto', padding: '0 1.5rem' }}
                                    >
                                        {isLoading ? "Sending…" : "✨ Send Link"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className={styles.divider}>
                        <span>OR USE PASSWORD</span>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className={styles['form-group']}>
                            <label className={styles.label}>Email</label>
                            <input
                                type="email"
                                name="email"
                                required
                                placeholder="name@example.com"
                                className={styles.input}
                            />
                        </div>

                        <div className={styles['form-group']}>
                            <label className={styles.label}>Password</label>
                            <input
                                type="password"
                                name="password"
                                required
                                placeholder="••••••••"
                                className={styles.input}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={styles['submit-btn']}
                        >
                            {isLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span className={styles.spinner}></span>
                                    Signing In...
                                </div>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    {canResendVerification && (
                        <div className={styles.magicLinkSection}>
                            <form onSubmit={handleResendVerification}>
                                <div className={styles['form-group']}>
                                    <label className={styles.label}>Resend verification email</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="name@example.com"
                                            className={styles.input}
                                            required
                                            disabled={isResendingVerification}
                                        />
                                        <button
                                            type="submit"
                                            disabled={isResendingVerification}
                                            className={styles['submit-btn']}
                                            style={{ width: 'auto', padding: '0 1rem' }}
                                        >
                                            {isResendingVerification ? "Sending…" : "Resend"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                <p className={styles.footer}>
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className={styles.link}>
                        Create one now
                    </Link>
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
