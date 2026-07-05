"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { str } from "@/lib/formData";
import { checkPassword, sessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function login(formData: FormData) {
  const password = str(formData, "password");
  const from = str(formData, "from");

  if (!password || !checkPassword(password)) {
    redirect(`/login?error=1${from ? `&from=${encodeURIComponent(from)}` : ""}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  redirect(from && from.startsWith("/") ? from : "/");
}
