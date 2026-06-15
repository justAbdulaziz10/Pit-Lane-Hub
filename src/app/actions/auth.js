'use server'

import { prisma } from "@/lib/prisma"
import { isValidEmail, validatePassword } from "@/lib/validation"
import bcrypt from "bcryptjs"

export async function registerUser(formData) {
    const name = formData.get("name")
    const email = formData.get("email")
    const password = formData.get("password")

    if (!email || !password) {
        return { error: "Missing required fields" }
    }

    if (!isValidEmail(email)) {
        return { error: "Please enter a valid email address" }
    }

    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) {
        return { error: passwordCheck.message }
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return { error: "Email already in use" }
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            }
        })

        return { success: true }
    } catch (error) {
        console.error("Registration error:", error)
        return { error: "Something went wrong" }
    }
}
