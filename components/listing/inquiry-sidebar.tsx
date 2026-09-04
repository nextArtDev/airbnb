import { getTranslations } from "next-intl/server";
import { CalendarClock, HandCoins, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";

interface InquirySidebarProps {
  type: "monthly" | "sale";
  ownerId: string;
  listingId: string;
  isOwner: boolean;
  monthlyRent?: number | bigint | null;
  mortgageAmount?: number | bigint | null;
  salePrice?: number | bigint | null;
  city: string;
}

/**
 * Sidebar for monthly rentals (رهن و اجاره) and sale listings. These are
 * inquiry-based: prices are shown up front and the visitor contacts the owner
 * through Messages to arrange the contract or viewing.
 */
export async function InquirySidebar({
  type,
  ownerId,
  listingId,
  isOwner,
  monthlyRent,
  mortgageAmount,
  salePrice,
  city,
}: InquirySidebarProps) {
  const t = await getTranslations("listing");

  // BigInt columns normalized to Number for formatting.
  const rent = Number(monthlyRent ?? 0);
  const deposit = Number(mortgageAmount ?? 0);
  const price = Number(salePrice ?? 0);

  const rows =
    type === "monthly"
      ? [
          {
            icon: HandCoins,
            label: t("monthlyRent"),
            value:
              rent > 0
                ? `${formatMoney(rent, "fa")} / ${t("perMonth")}`
                : t("noMonthlyRent"),
          },
          {
            icon: CalendarClock,
            label: t("mortgage"),
            value: deposit > 0 ? formatMoney(deposit, "fa") : t("noMortgage"),
          },
        ]
      : [
          {
            icon: Tag,
            label: t("salePrice"),
            value: formatMoney(price, "fa"),
          },
        ];

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold">
        {type === "monthly" ? t("monthlyTermsTitle") : t("saleTitle")}
      </h2>

      <dl className="space-y-3">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="size-4" />
              {label}
            </dt>
            <dd className="text-sm font-bold" dir="auto">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {type === "monthly" && (
        <p className="mt-4 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
          {t("mortgageNote")}
        </p>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        {type === "monthly" ? t("monthlyInquiryHint", { city }) : t("saleInquiryHint", { city })}
      </p>

      {isOwner ? (
        <Button disabled className="mt-4 w-full rounded-xl">
          {t("selfInquiry")}
        </Button>
      ) : (
        <Button
          asChild
          className="mt-4 w-full rounded-xl bg-rose-600 hover:bg-rose-700"
        >
          <Link href={`/inbox?to=${ownerId}&listing=${listingId}`}>
            {type === "monthly" ? t("requestRental") : t("requestViewing")}
          </Link>
        </Button>
      )}
    </div>
  );
}
