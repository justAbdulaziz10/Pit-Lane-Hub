'use client'

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
    const router = useRouter()
    const [error, setError] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")

        const email = e.target.email.value
        const password = e.target.password.value

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        })

        if (result?.error) {
            setError("Invalid email or password")
        } else {
            router.push("/")
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0E14] text-white">
            <div className="bg-[#151921] p-8 rounded-xl w-full max-w-md border border-white/5 shadow-2xl">
                <h1 className="text-2xl font-bold mb-6 text-center">Sign In to F1 Hub</h1>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-400">Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            className="w-full bg-[#0B0E14] border border-white/10 rounded p-2 text-white focus:outline-none focus:border-[#E10600]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-400">Password</label>
                        <input
                            type="password"
                            name="password"
                            required
                            className="w-full bg-[#0B0E14] border border-white/10 rounded p-2 text-white focus:outline-none focus:border-[#E10600]"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-[#E10600] text-white py-2 rounded font-bold hover:bg-[#C00500] transition"
                    >
                        Sign In
                    </button>
                </form>

                <p className="mt-4 text-center text-gray-400 text-sm">
                    Don't have an account? <a href="/signup" className="text-[#E10600] hover:underline">Sign up</a>
                </p>
            </div>
        </div>
    )
}
