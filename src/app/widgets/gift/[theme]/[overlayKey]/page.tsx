import { redirect } from "next/navigation";
import { getOverlayRuntimeUrlForWorkspaceKey } from "@/features/overlay-builder/actions/getOverlayRuntimeUrl";

type GiftWidgetPageProps = {
  params: Promise<{
    theme: string;
    overlayKey: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GiftWidgetPage({ params, searchParams }: GiftWidgetPageProps) {
  const { overlayKey } = await params;
  const query = searchParams ? await searchParams : {};
  const runtimeUrl = await getOverlayRuntimeUrlForWorkspaceKey(overlayKey, "GIFT");
  const nextParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (typeof value === "string") {
      nextParams.set(key, value);
    }
  });

  redirect(`${runtimeUrl ?? "/dashboard"}${nextParams.size ? `?${nextParams.toString()}` : ""}`);
}
