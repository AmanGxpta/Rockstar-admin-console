"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, findDemoUser, homeFor } from "./session";

export type SignInState = { error?: string };

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!/.+@.+\..+/.test(email.trim())) {
    return { error: "Enter a valid email address." };
  }
  if (password.trim().length < 1) {
    return { error: "Enter your password." };
  }

  const user = findDemoUser(email);
  if (!user) {
    return { error: "We don't recognise that email." };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify({ email: user.email }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(homeFor(user.role));
}

export async function signOut() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
