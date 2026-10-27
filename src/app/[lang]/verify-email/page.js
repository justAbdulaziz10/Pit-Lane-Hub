import Link from "next/link";
import styles from "../status.module.css";

export const metadata = {
    title: "Verify email",
    robots: { index: false, follow: false },
    // Keep the token in this URL from leaking to other origins through the Referer header.
    referrer: "same-origin",
};

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

/** Confirmation step for emailed verification links: only the button's POST verifies. */
export default async function VerifyEmailPage({ searchParams }) {
    const { token } = await searchParams;
    const hasToken = typeof token === "string" && TOKEN_PATTERN.test(token);

    return (
        <div className={styles.wrapper}>
            <h1 className={styles.title}>Verify your email</h1>
            {hasToken ? (
                <form method="post" action="/api/auth/verify" className={styles.actions}>
                    <input type="hidden" name="token" value={token} />
                    <button type="submit" className="btn btn-primary">Verify email</button>
                </form>
            ) : (
                <>
                    <p className={styles.message}>This verification link is invalid or has expired.</p>
                    <div className={styles.actions}>
                        <Link href="/login?verification=invalid" className="btn btn-primary">Sign in</Link>
                    </div>
                </>
            )}
        </div>
    );
}
