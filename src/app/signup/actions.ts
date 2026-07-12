"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { createSessionToken, hashPassword, SESSION_COOKIE } from "@/lib/auth";
import { sendEmailVerification } from "@/lib/verification";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(error: string): never {
  redirect(`/signup?error=${encodeURIComponent(error)}`);
}

export async function signup(formData: FormData) {
  const businessName = str(formData, "businessName");
  const name = str(formData, "name");
  const emailRaw = str(formData, "email");
  const password = str(formData, "password");

  if (!businessName || !name || !emailRaw || !password) {
    fail("All fields are required.");
  }
  const email = emailRaw.toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    fail("Enter a valid email address.");
  }
  if (password.length < 8) {
    fail("Password must be at least 8 characters.");
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    fail("An account with that email already exists — try signing in instead.");
  }

  const user = await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: businessName },
    });
    return tx.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        role: "owner",
        organizationId: organization.id,
      },
    });
  });

  await sendEmailVerification({
    id: user.id,
    email: user.email,
    name: user.name,
    organizationName: businessName,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/");
}
