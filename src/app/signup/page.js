'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { registerUser } from "../actions/auth"

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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0B0E14]">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[#1a1a1a] via-[#0B0E14] to-[#000000]"></div>
                <div className="absolute top-[10%] -left-[10%] w-[500px] h-[500px] rounded-full bg-[#E10600] opacity-[0.04] blur-[100px]"></div>
                <div className="absolute bottom-[10%] -right-[10%] w-[500px] h-[500px] rounded-full bg-[#E10600] opacity-[0.04] blur-[100px]"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-4 animate-fade-in">
                {/* Logo Area */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block group">
                        <span className="text-4xl mb-2 block transform group-hover:scale-110 transition-transform duration-300">🏎️</span>
                        <div className="flex items-center justify-center gap-2 font-display font-black text-2xl tracking-tight">
                            <span className="text-white">PIT LANE</span>
                            <span className="text-[#E10600]">HUB</span>
                        </div>
                    </Link>
                </div>

                {/* Card */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <h1 className="text-2xl font-bold text-white mb-2 text-center font-display">Create Account</h1>
                    <p className="text-gray-400 text-center mb-8 text-sm">Join the community for exclusive access</p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-6 text-sm flex items-center gap-2 animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="Max Verstappen"
                                    className="w-full bg-[#0B0E14]/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Email</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    placeholder="name@example.com"
                                    className="w-full bg-[#0B0E14]/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-[#0B0E14]/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-[#E10600] to-[#B80500] text-white font-bold py-3.5 rounded-lg shadow-[0_0_20px_rgba(225,6,0,0.3)] hover:shadow-[0_0_30px_rgba(225,6,0,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wide text-sm mt-2"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Creating Account...
                                </div>
                            ) : (
                                "Sign Up"
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-gray-500 text-sm">
                    Already have an account?{" "}
                    <Link href="/login" className="text-[#E10600] font-semibold hover:text-[#FFD93D] transition-colors">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    )
}
