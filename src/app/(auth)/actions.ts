"use server";

import { redirect } from "next/navigation";
import {
  createSession,
  destroySession,
  hashPassword,
  isDesktopAppMode,
  verifyPassword
} from "@/server/auth/session";
import { databaseUnavailableMessage, isDatabaseUnavailableError } from "@/server/db/errors";
import { prisma } from "@/server/db/prisma";
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

  try {
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

    const session = await createSession(user.id);

    redirectAfterSessionCreated(session.token, "/dashboard");
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      formError("/register", databaseUnavailableMessage());
    }

    throw error;
  }

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

  try {
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

    const session = await createSession(user.id);

    redirectAfterSessionCreated(session.token, "/dashboard");
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      formError("/login", databaseUnavailableMessage());
    }

    throw error;
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();

  if (isDesktopAppMode()) {
    redirect("/desktop-session/logout");
  }

  redirect("/login");
}

function redirectAfterSessionCreated(token: string, next: string): never {
  if (isDesktopAppMode()) {
    redirect(`/desktop-session?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}
