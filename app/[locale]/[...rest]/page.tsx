import { notFound } from "next/navigation";

export default async function CatchAllPage(
  props: PageProps<"/[locale]/[...rest]">,
) {
  await props.params;
  notFound();
}
