import { redirect } from "next/navigation";

type FlowActionWidgetPageProps = {
  params: Promise<{
    overlayKey: string;
    flowId: string;
  }>;
  searchParams?: Promise<{
    position?: string;
  }>;
};

export default async function FlowActionWidgetPage({
  params,
  searchParams
}: FlowActionWidgetPageProps) {
  const { overlayKey, flowId } = await params;
  const query = searchParams ? await searchParams : {};
  const paramsOut = new URLSearchParams({
    type: "alert",
    position: query.position ?? "center",
    flowId
  });

  redirect(`/overlay-action/${overlayKey}?${paramsOut.toString()}`);
}
