import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function CatchAllPage(
  props: PageProps<"/[locale]/[...rest]">,
) {
  await props.params;
  notFound();
}
