import { redirect } from "next/navigation";
import { getAuthState, homeFor } from "@/lib/session";

export default async function Home() {
  const state = await getAuthState();
  if (state.status === "signed-out") redirect("/login");
  if (state.status === "no-role") redirect("/no-access");
  redirect(homeFor(state.session.role));
}
