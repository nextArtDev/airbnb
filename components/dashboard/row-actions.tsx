"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  adminDeleteListing,
  adminDeleteReview,
  cancelStaleReservation,
  setListingPublished,
  toggleUserBan,
  unbanUser,
} from "@/app/(dashboard)/dashboard/lib/actions/admin";

export function BanButtons({
  userId,
  banned,
}: {
  userId: string;
  banned: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!banned) {
    return (
      <Button
        variant="outline"
        size="xs"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await toggleUserBan(userId);
            if (res.success) toast.success("کاربر مسدود شد");
            else toast.error("انجام نشد");
          })
        }
      >
        مسدودسازی
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="xs"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await unbanUser(userId);
          if (res.success) toast.success("رفع مسدودی شد");
          else toast.error("انجام نشد");
        })
      }
    >
      رفع مسدودی
    </Button>
  );
}

export function PublishToggleButton({
  listingId,
  published,
}: {
  listingId: string;
  published: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="xs"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setListingPublished(listingId, !published);
          toast.success(published ? "از انتشار خارج شد" : "منتشر شد");
        })
      }
    >
      {published ? "لغو انتشار" : "انتشار"}
    </Button>
  );
}

export function AdminDeleteButton({
  kind,
  id,
}: {
  kind: "listing" | "review" | "reservation";
  id: string;
}) {
  const [pending, startTransition] = useTransition();

  function run() {
    if (!window.confirm("مطمئن هستید؟ این عمل بازگشت‌پذیر نیست.")) return;
    startTransition(async () => {
      let ok = false;
      if (kind === "listing") ok = (await adminDeleteListing(id)).success;
      if (kind === "review") ok = (await adminDeleteReview(id)).success;
      if (kind === "reservation") ok = (await cancelStaleReservation(id)).success;
      if (ok) toast.success("انجام شد");
      else toast.error("انجام نشد");
    });
  }

  return (
    <Button
      variant="outline"
      size="xs"
      disabled={pending}
      onClick={run}
      className="text-destructive"
    >
      {pending ? <Spinner className="size-3" /> : kind === "reservation" ? "لغو" : "حذف"}
    </Button>
  );
}
