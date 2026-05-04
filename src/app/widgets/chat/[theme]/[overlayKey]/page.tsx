import { redirect } from "next/navigation";
import { getOverlayRuntimeUrlForWorkspaceKey } from "@/features/overlay-builder/actions/getOverlayRuntimeUrl";

type ChatWidgetPageProps = {
  params: Promise<{
    theme: string;
    overlayKey: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ChatWidgetPage({ params, searchParams }: ChatWidgetPageProps) {
  const { overlayKey } = await params;
  const query = searchParams ? await searchParams : {};
  const runtimeUrl = await getOverlayRuntimeUrlForWorkspaceKey(overlayKey, "CHAT");
  const nextParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (typeof value === "string") {
      nextParams.set(key, value);
    }
  });

  redirect(`${runtimeUrl ?? "/dashboard"}${nextParams.size ? `?${nextParams.toString()}` : ""}`);
}
