"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { saveUserAvatarFile, deleteUploadedFile } from "@/lib/uploads";
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

export async function uploadMyAvatar(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("An image file is required.");
  }

  const fullUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const avatarUrl = await saveUserAvatarFile(user.id, file);
  await db.user.update({ where: { id: user.id }, data: { avatarUrl } });

  if (fullUser.avatarUrl) {
    await deleteUploadedFile(fullUser.avatarUrl);
  }

  revalidatePath("/account");
}

export async function removeMyAvatar() {
  const user = await requireUser();
  const fullUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (fullUser.avatarUrl) {
    await deleteUploadedFile(fullUser.avatarUrl);
    await db.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  }
  revalidatePath("/account");
}
