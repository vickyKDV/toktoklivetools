import { redirect } from "next/navigation";

type ChatFocusWidgetPageProps = {
  params: Promise<{
    theme: string;
    overlayKey: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ChatFocusWidgetPage({
  params,
  searchParams
}: ChatFocusWidgetPageProps) {
  const { theme, overlayKey } = await params;
  const query = searchParams ? await searchParams : {};
  const nextParams = new URLSearchParams({
    type: "focus-chat",
    theme
  });

  Object.entries(query).forEach(([key, value]) => {
    if (typeof value === "string") {
      nextParams.set(key, value);
    }
  });

  redirect(`/overlay/${overlayKey}?${nextParams.toString()}`);
}
