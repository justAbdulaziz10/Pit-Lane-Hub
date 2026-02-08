'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { registerUser } from "../actions/auth"
import styles from "./page.module.css"

export default function SignupPage() {
    const router = useRouter()
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)

        const formData = new FormData(e.target)

        try {
            const result = await registerUser(formData)

            if (result.error) {
                setError(result.error)
                setIsLoading(false)
            } else {
                router.push("/login?registered=true")
            }
        } catch (err) {
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
                    <h1 className={styles.title}>Create Account</h1>
                    <p className={styles.subtitle}>Join the community for exclusive access</p>

                    {error && (
                        <div className={styles.error}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className={styles['form-group']}>
                            <label className={styles.label}>Full Name</label>
                            <input
                                type="text"
                                name="name"
                                required
                                placeholder="Max Verstappen"
                                className={styles.input}
                            />
                        </div>

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
                                    Creating Account...
                                </div>
                            ) : (
                                "Sign Up"
                            )}
                        </button>
                    </form>
                </div>

                <p className={styles.footer}>
                    Already have an account?{" "}
                    <Link href="/login" className={styles.link}>
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    )
}
