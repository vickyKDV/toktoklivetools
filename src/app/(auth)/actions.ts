"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema, registerSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

function formError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    formError("/register", parsed.error.issues[0]?.message ?? "Registration failed");
  }

  const existing = await prisma.user.findUnique({
    where: {
      email: parsed.data.email
    },
    select: {
      id: true
    }
  });

  if (existing) {
    formError("/register", "Email is already registered");
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const defaultSlug = slugify(`${parsed.data.name} live`);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      memberships: {
        create: {
          role: "OWNER",
          workspace: {
            create: {
              name: `${parsed.data.name}'s Live`,
              slug: `${defaultSlug}-${crypto.randomUUID().slice(0, 6)}`,
              overlayKey: crypto.randomUUID().replaceAll("-", "")
            }
          }
        }
      }
    },
    select: {
      id: true
    }
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    formError("/login", parsed.error.issues[0]?.message ?? "Login failed");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsed.data.email
    }
  });

  if (!user) {
    formError("/login", "Invalid email or password");
  }

  const isValid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!isValid) {
    formError("/login", "Invalid email or password");
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
