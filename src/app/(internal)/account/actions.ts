"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { requireUser } from "@/lib/session";

export async function changeMyPassword(formData: FormData) {
  const user = await requireUser();

  const currentPassword = str(formData, "currentPassword");
  const newPassword = str(formData, "newPassword");
  if (!currentPassword || !newPassword) {
    redirect("/account?error=missing");
  }

  const fullUser = await db.user.findUnique({ where: { id: user.id } });
  if (!fullUser || !verifyPassword(currentPassword, fullUser.passwordHash)) {
    redirect("/account?error=wrong_password");
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) },
  });

  redirect("/account?saved=1");
}
