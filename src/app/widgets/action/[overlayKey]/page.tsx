import { redirect } from "next/navigation";

type ActionWidgetPageProps = {
  params: Promise<{
    overlayKey: string;
  }>;
  searchParams?: Promise<{
    position?: string;
    flowId?: string;
  }>;
};

export default async function ActionWidgetPage({ params, searchParams }: ActionWidgetPageProps) {
  const { overlayKey } = await params;
  const query = searchParams ? await searchParams : {};
  const paramsOut = new URLSearchParams({
    type: "alert",
    position: query.position ?? "center"
  });

  if (query.flowId) {
    paramsOut.set("flowId", query.flowId);
  }

  redirect(`/overlay-action/${overlayKey}?${paramsOut.toString()}`);
}
