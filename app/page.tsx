import { redirect } from "next/navigation";

// Authenticated users land on the dashboard; the proxy redirects everyone
// else to /login.
export default function RootPage() {
  redirect("/dashboard");
}
