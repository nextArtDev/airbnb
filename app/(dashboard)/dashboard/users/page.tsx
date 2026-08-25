import Link from "next/link";
import { Ban } from "lucide-react";
import { BanButtons } from "@/components/dashboard/row-actions";
import { Badge } from "@/components/ui/badge";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 20;

export default async function DashboardUsersPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [users, count] = await prisma.$transaction([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        banned: true,
        createdAt: true,
        _count: { select: { listings: true, reservations: true } },
      },
    }),
    prisma.user.count(),
  ]);

  const isNext = count > skip + users.length;
  void isNext;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">کاربران ({count.toLocaleString("fa-IR")})</h1>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-start text-muted-foreground">
            <tr>
              <th className="p-3 text-start">نام</th>
              <th className="p-3 text-start">ایمیل / موبایل</th>
              <th className="p-3 text-start">نقش</th>
              <th className="p-3 text-start">اقامتگاه‌ها</th>
              <th className="p-3 text-start">رزروها</th>
              <th className="p-3 text-start">وضعیت</th>
              <th className="p-3 text-start"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3 text-muted-foreground" dir="ltr">
                  {u.phoneNumber ?? u.email}
                </td>
                <td className="p-3">
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                    {u.role === "admin" ? "مدیر" : "کاربر"}
                  </Badge>
                </td>
                <td className="p-3">{u._count.listings}</td>
                <td className="p-3">{u._count.reservations}</td>
                <td className="p-3">
                  {u.banned ? (
                    <span className="inline-flex items-center gap-1 text-destructive">
                      <Ban className="size-3.5" /> مسدود
                    </span>
                  ) : (
                    <span className="text-emerald-600">فعال</span>
                  )}
                </td>
                <td className="p-3">
                  {u.role !== "admin" && (
                    <BanButtons userId={u.id} banned={Boolean(u.banned)} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} hasMore={count > skip + users.length} />
    </>
  );
}

function Pagination({ page, hasMore }: { page: number; hasMore: boolean }) {
  return (
    <div className="flex items-center justify-between">
      {page > 1 ? (
        <Link
          href={`/dashboard/users?page=${page - 1}`}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
        >
          قبلی
        </Link>
      ) : (
        <span />
      )}
      {hasMore && (
        <Link
          href={`/dashboard/users?page=${page + 1}`}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
        >
          بعدی
        </Link>
      )}
    </div>
  );
}
