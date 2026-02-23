import { redirect } from "next/navigation";

// Prevent 404s from nav links (/services). We currently use /guide for content.
export default function ServicesPage() {
  redirect("/guide");
}


