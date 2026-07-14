import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { LoginScreen } from "@/components/login/login-screen";

export default async function LoginPage() {
  const { userId } = await auth();
  // "/" fans out by role — no need to resolve it here.
  if (userId) redirect("/");
  return <LoginScreen />;
}
