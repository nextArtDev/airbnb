import { setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ListingForm } from "@/components/host/listing-form";

export default async function NewListingPage(
  props: PageProps<"/[locale]/hostings/new">,
) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl flex-1 px-4 py-10">
        <ListingForm />
      </main>
      <Footer />
    </>
  );
}
