import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function HomePage() {
  const cookieStore = cookies();
  const token = cookieStore.get("pr_auth_token")?.value;

  if (token) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
