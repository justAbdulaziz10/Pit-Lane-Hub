'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { registerUser } from "@/app/actions/auth"
import styles from "../login/page.module.css"

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
        } catch {
            setError("The account could not be created. Try again.")
            setIsLoading(false)
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.panel}>
                <h1 className={styles.title}>Create account</h1>
                <p className={styles.intro}>
                    You need an account to subscribe to Pit Lane Pro. We email you a link to verify the address.
                </p>

                {error && <p className={styles.error} role="alert">{error}</p>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor="signup-name" className={styles.label}>Name</label>
                        <input id="signup-name" type="text" name="name" autoComplete="name" required />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="signup-email" className={styles.label}>Email</label>
                        <input id="signup-email" type="email" name="email" autoComplete="email" required />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="signup-password" className={styles.label}>Password</label>
                        <input
                            id="signup-password"
                            type="password"
                            name="password"
                            autoComplete="new-password"
                            minLength={8}
                            aria-describedby="signup-password-hint"
                            required
                        />
                        <span id="signup-password-hint" className={styles.hint}>
                            At least 8 characters, with a letter and a number.
                        </span>
                    </div>

                    <button type="submit" disabled={isLoading} className="btn btn-primary">
                        {isLoading ? "Creating account…" : "Create account"}
                    </button>
                </form>

                <p className={styles.switch}>
                    Already have an account? <Link href="/login">Sign in</Link>
                </p>
            </div>
        </div>
    )
}
