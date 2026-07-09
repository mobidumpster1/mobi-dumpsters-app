"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { createSessionToken, verifyPassword, SESSION_COOKIE } from "@/lib/auth";

export async function login(formData: FormData) {
  const email = str(formData, "email");
  const password = str(formData, "password");
  const from = str(formData, "from");

  const user = email
    ? await db.user.findUnique({ where: { email: email.toLowerCase() } })
    : null;

  if (!user || !user.active || !password || !verifyPassword(password, user.passwordHash)) {
    redirect(`/login?error=1${from ? `&from=${encodeURIComponent(from)}` : ""}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(from && from.startsWith("/") ? from : "/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
