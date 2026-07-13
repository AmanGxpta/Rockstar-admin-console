import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/login/login-screen";
import { getSession, homeFor } from "@/lib/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));
  return <LoginScreen />;
}
