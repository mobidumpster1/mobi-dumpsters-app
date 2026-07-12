"use server";

import { redirect } from "next/navigation";
import { str } from "@/lib/formData";
import { hashPassword } from "@/lib/auth";
import { applyPasswordReset } from "@/lib/verification";

function fail(token: string | null, error: string): never {
  const tokenParam = token ? `token=${encodeURIComponent(token)}&` : "";
  redirect(`/reset-password?${tokenParam}error=${encodeURIComponent(error)}`);
}

export async function resetPassword(formData: FormData) {
  const token = str(formData, "token");
  const password = str(formData, "password");
  const confirmPassword = str(formData, "confirmPassword");

  if (!token) fail(token, "Missing reset link.");
  if (!password || password.length < 8) fail(token, "Password must be at least 8 characters.");
  if (password !== confirmPassword) fail(token, "Passwords don't match.");

  const result = await applyPasswordReset(token, hashPassword(password));
  if (!result.ok) fail(token, result.error);

  redirect("/login?reset=1");
}
