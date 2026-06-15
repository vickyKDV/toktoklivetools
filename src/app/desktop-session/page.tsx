import { redirect } from "next/navigation";
import { DesktopSessionClient } from "@/app/desktop-session/DesktopSessionClient";

type DesktopSessionPageProps = {
  searchParams?: Promise<{
    token?: string;
    next?: string;
  }>;
};

export default async function DesktopSessionPage({ searchParams }: DesktopSessionPageProps) {
  const query = searchParams ? await searchParams : {};

  if (!query.token) {
    redirect("/login");
  }

  return <DesktopSessionClient token={query.token} nextPath={query.next ?? "/dashboard"} />;
}
