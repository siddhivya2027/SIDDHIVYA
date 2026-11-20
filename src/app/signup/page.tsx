import { redirect } from "next/navigation";

/** SIDDHIVYA runs one agency workspace, so new sellers start with a conversation instead of a self sign-up. */
export default function Signup() {
  redirect("/#enquiry");
}
