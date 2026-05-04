import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { requireUser } from "@/lib/auth";
import { getUserWorkspaces } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const workspaces = await getUserWorkspaces(user.id);

  return (
    <div className="dashboard-grid min-h-screen">
      <DashboardSidebar user={user} workspaces={workspaces} />
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
