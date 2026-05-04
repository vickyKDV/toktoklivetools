import { redirect } from "next/navigation";

type LegacyActiveOverlayOutputPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export default async function LegacyActiveOverlayOutputPage({ params }: LegacyActiveOverlayOutputPageProps) {
  const { workspaceId } = await params;

  redirect(`/dashboard/workspaces/${workspaceId}/overlays`);
}
