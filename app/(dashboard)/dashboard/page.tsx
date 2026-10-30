import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  CalendarCheck2,
  CalendarClock,
  CreditCard,
  FileWarning,
  Gauge,
  ImageOff,
  LayoutDashboard,
  MessageSquareText,
  Receipt,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { CountBadge, PageHeader } from "@/components/dashboard/page-header";
import { KpiCard, MiniStat } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { SegmentBar } from "@/components/dashboard/segment-bar";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getOverview } from "@/lib/dashboard/analytics";
import {
  computeDelta,
  faCompactMoney,
  faDate,
  faMoney,
  faNumber,
  faPercent,
  faRelative,
} from "@/lib/dashboard/format";
import { CATEGORY_FA, STATUS_FA, STATUS_ORDER, TYPE_FA } from "@/lib/dashboard/labels";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const data = await getOverview();
  const { counts, revenue, growth, quality, distribution, attention } = data;

  const statusTotal = Object.values(distribution.byStatus).reduce(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  const typeTotal = distribution.byType.reduce((sum, row) => sum + row.count, 0);
  const attentionCount =
    attention.stalePendings.length +
    attention.draftListings.length +
    attention.lowRated.length;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutDashboard}
        title="نمای کلی"
        description="تصویر لحظه‌ای از درآمد، رزروها و سلامت آگهی‌ها"
        badge={
          <CountBadge>
            {faNumber(counts.reservations)} رزرو ·{" "}
            {faNumber(counts.listings)} اقامتگاه
          </CountBadge>
        }
        actions={
          <Link
            href="/"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium transition hover:bg-accent"
          >
            مشاهده سایت
            <ArrowLeft className="size-3.5" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="درآمد ۳۰ روز اخیر"
          value={faCompactMoney(revenue.last30)}
          hint={`از مجموع ${faCompactMoney(revenue.total)} تومان`}
          icon={CreditCard}
          accent="brand"
          delta={computeDelta(revenue.last30, revenue.prev30)}
          deltaLabel="نسبت به ۳۰ روز قبل"
          trend={data.trend.map((point) => point.revenue)}
        />
        <KpiCard
          label="رزروهای پرداخت‌شده"
          value={faNumber(counts.paidCount)}
          hint={`${faNumber(counts.pendingCount)} در انتظار پرداخت`}
          icon={CalendarCheck2}
          accent="emerald"
          delta={computeDelta(growth.reservations30, growth.reservationsPrev30)}
          deltaLabel="رزرو جدید در ۳۰ روز"
          trend={data.trend.map((point) => point.bookings)}
        />
        <KpiCard
          label="کاربران"
          value={faNumber(counts.users)}
          hint={`${faNumber(growth.users30)} کاربر جدید در ۳۰ روز`}
          icon={Users}
          accent="sky"
          delta={computeDelta(growth.users30, growth.usersPrev30)}
          deltaLabel="نسبت به دوره قبل"
          trend={data.trend.map((point) => point.users)}
        />
        <KpiCard
          label="اقامتگاه‌ها"
          value={faNumber(counts.listings)}
          hint={`${faNumber(counts.publishedListings)} منتشرشده`}
          icon={BedDouble}
          accent="violet"
          delta={computeDelta(growth.listings30, growth.listingsPrev30)}
          deltaLabel="آگهی جدید در ۳۰ روز"
          trend={data.trend.map((point) => point.listings)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RevenueChart data={data.trend} className="lg:col-span-2" />

        <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">سلامت عملیات</h2>
            <Gauge className="size-4 text-muted-foreground" />
          </div>

          <div className="space-y-3">
            <Meter
              label="نرخ اشغال (۳۰ روز)"
              value={quality.occupancy}
              tone="success"
              caption={`${faNumber(quality.occupancy)}٪ از ظرفیت آگهی‌های منتشرشده`}
            />
            <Meter
              label="نرخ تبدیل پرداخت"
              value={quality.paidRatio}
              tone="brand"
              caption={`${faNumber(counts.paidCount)} از ${faNumber(counts.reservations)} رزرو پرداخت شده`}
            />
            <Meter
              label="کیفیت نظرات"
              value={(quality.averageRating / 5) * 100}
              tone="warning"
              caption={`میانگین ${faNumber(quality.averageRating)} از ۵ · ${faNumber(counts.reviews)} نظر`}
            />
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2">
            <MiniStat
              label="میانگین هر رزرو"
              value={`${faCompactMoney(revenue.avgBooking)}`}
              hint="تومان"
              icon={Receipt}
            />
            <MiniStat
              label="میانگین اقامت"
              value={`${faNumber(revenue.avgNights)} شب`}
              icon={CalendarClock}
            />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="flex flex-col rounded-2xl border bg-card lg:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-rose-500" />
              <h2 className="text-sm font-semibold">پرفروش‌ترین اقامتگاه‌ها</h2>
            </div>
            <Link
              href="/dashboard/listings?sort=revenue"
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              همه آگهی‌ها
            </Link>
          </div>

          {data.topListings.length === 0 ? (
            <p className="px-5 py-10 text-center text-xs text-muted-foreground">
              هنوز رزرو پرداخت‌شده‌ای ثبت نشده است.
            </p>
          ) : (
            <ul className="divide-y">
              {data.topListings.map((listing, index) => {
                const max = data.topListings[0]?.revenue || 1;
                return (
                  <li key={listing.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground tabular-nums">
                      {faNumber(index + 1)}
                    </span>
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {listing.coverImage ? (
                        <Image
                          src={listing.coverImage}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <ImageOff className="absolute inset-0 m-auto size-4 text-muted-foreground" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{listing.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="truncate text-[11px] text-muted-foreground">
                          {listing.city} · {faNumber(listing.bookings)} رزرو
                        </span>
                        <SegmentBar
                          percent={(listing.revenue / max) * 100}
                          segments={18}
                          tone="brand"
                          className="hidden h-1.5 w-24 sm:flex"
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {faCompactMoney(listing.revenue)}
                      <span className="ms-1 text-[10px] font-normal text-muted-foreground">
                        تومان
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="flex flex-col rounded-2xl border bg-card">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              <h2 className="text-sm font-semibold">نیازمند بررسی</h2>
            </div>
            <CountBadge>{faNumber(attentionCount)}</CountBadge>
          </div>

          <div className="flex-1 divide-y">
            {attention.stalePendings.map((row) => (
              <AttentionRow
                key={row.id}
                icon={CalendarClock}
                title="رزرو معطل‌مانده"
                description={`${row.user.name} · ${row.listing.title}`}
                meta={faRelative(row.createdAt)}
                href="/dashboard/reservations?status=Pending"
              />
            ))}
            {attention.draftListings.map((row) => (
              <AttentionRow
                key={row.id}
                icon={FileWarning}
                title="آگهی منتشرنشده"
                description={`${row.title} · ${row.user.name}`}
                meta={faRelative(row.createdAt)}
                href="/dashboard/listings?published=draft"
              />
            ))}
            {attention.lowRated.map((row) => (
              <AttentionRow
                key={row.id}
                icon={Star}
                title="امتیاز پایین"
                description={`${row.title} · ${faNumber(row.count)} نظر`}
                meta={`${faNumber(Math.round(row.average * 10) / 10)} از ۵`}
                href={`/dashboard/reviews?q=${encodeURIComponent(row.title)}`}
              />
            ))}

            {attentionCount === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                  <CalendarCheck2 className="size-5" />
                </span>
                <p className="text-sm font-medium">همه چیز مرتب است</p>
                <p className="text-xs text-muted-foreground">
                  رزرو معطل، آگهی پیش‌نویس یا نظر کم‌امتیازی وجود ندارد.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">وضعیت رزروها</h2>
            <Receipt className="size-4 text-muted-foreground" />
          </div>
          <ul className="space-y-2.5">
            {STATUS_ORDER.filter(
              (status) => (distribution.byStatus[status] ?? 0) > 0,
            ).map((status) => {
              const count = distribution.byStatus[status] ?? 0;
              const percent = statusTotal === 0 ? 0 : (count / statusTotal) * 100;
              return (
                <li key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{STATUS_FA[status]}</span>
                    <span className="flex items-center gap-1.5 font-medium tabular-nums">
                      <span>{faNumber(count)}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {faPercent(percent)}
                      </span>
                    </span>
                  </div>
                  <SegmentBar
                    percent={percent}
                    segments={30}
                    tone={
                      status === "Paid"
                        ? "success"
                        : status === "Pending"
                          ? "warning"
                          : "danger"
                    }
                    className="h-1.5"
                    label={STATUS_FA[status]}
                  />
                </li>
              );
            })}
            {statusTotal === 0 && (
              <li className="py-6 text-center text-xs text-muted-foreground">
                رزروی ثبت نشده است.
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">ترکیب آگهی‌ها</h2>
            <BedDouble className="size-4 text-muted-foreground" />
          </div>
          <ul className="space-y-2.5">
            {distribution.byType.map((row) => {
              const percent = typeTotal === 0 ? 0 : (row.count / typeTotal) * 100;
              return (
                <li key={row.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{TYPE_FA[row.key]}</span>
                    <span className="flex items-center gap-1.5 font-medium tabular-nums">
                      <span>{faNumber(row.count)}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {faPercent(percent)}
                      </span>
                    </span>
                  </div>
                  <SegmentBar
                    percent={percent}
                    segments={30}
                    tone="brand"
                    className="h-1.5"
                    label={TYPE_FA[row.key]}
                  />
                </li>
              );
            })}
          </ul>

          <div className="mt-5 space-y-2 border-t pt-4">
            <p className="text-[11px] font-medium text-muted-foreground">
              پرتراکم‌ترین شهرها
            </p>
            <div className="flex flex-wrap gap-1.5">
              {distribution.byCity.map((row) => (
                <Link
                  key={row.city}
                  href={`/dashboard/listings?q=${encodeURIComponent(row.city)}`}
                  className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] transition hover:bg-accent"
                >
                  {row.city}
                  <span className="font-semibold tabular-nums">{faNumber(row.count)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">دسته‌بندی‌ها</h2>
            <MessageSquareText className="size-4 text-muted-foreground" />
          </div>
          <ul className="space-y-2">
            {distribution.byCategory.slice(0, 6).map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="text-muted-foreground">{CATEGORY_FA[row.key]}</span>
                <span className="flex flex-1 items-center gap-2">
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-rose-400"
                      style={{
                        width: `${(row.count / Math.max(1, distribution.byCategory[0]?.count ?? 1)) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="w-6 text-end font-medium tabular-nums">
                    {faNumber(row.count)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-rose-500" />
            <h2 className="text-sm font-semibold">آخرین رزروها</h2>
          </div>
          <Link
            href="/dashboard/reservations"
            className="text-xs text-muted-foreground transition hover:text-foreground"
          >
            همه رزروها
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-start font-medium">مهمان</th>
                <th className="px-4 py-2 text-start font-medium">اقامتگاه</th>
                <th className="px-4 py-2 text-start font-medium">بازه اقامت</th>
                <th className="px-4 py-2 text-start font-medium">مبلغ</th>
                <th className="px-4 py-2 text-start font-medium">وضعیت</th>
                <th className="px-4 py-2 text-start font-medium">ثبت</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.recentReservations.map((reservation) => (
                <tr key={reservation.id} className="transition hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{reservation.user.name}</td>
                  <td className="max-w-48 px-4 py-2.5">
                    <span className="line-clamp-1 text-muted-foreground">
                      {reservation.listing.title}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                    {faDate(reservation.startDate)} → {faDate(reservation.endDate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-semibold tabular-nums">
                    {faNumber(reservation.totalPrice)}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={reservation.paymentStatus} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                    {faRelative(reservation.createdAt)}
                  </td>
                </tr>
              ))}
              {data.recentReservations.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-xs text-muted-foreground"
                  >
                    هنوز رزروی ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="pb-2 text-center text-[11px] text-muted-foreground">
        مجموع درآمد پرداخت‌شده: {faMoney(revenue.total)}
      </p>
    </div>
  );
}

function Meter({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: number;
  caption: string;
  tone: "success" | "brand" | "warning";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {faPercent(clamped)}
        </span>
      </div>
      <SegmentBar percent={clamped} segments={28} tone={tone} className="h-2" label={label} />
      <p className="text-[11px] text-muted-foreground">{caption}</p>
    </div>
  );
}

function AttentionRow({
  icon: Icon,
  title,
  description,
  meta,
  href,
}: {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  meta: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition hover:bg-muted/40 sm:px-5",
      )}
    >
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium">{title}</span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {description}
        </span>
      </span>
      <span className="shrink-0 text-[11px] text-muted-foreground">{meta}</span>
    </Link>
  );
}
