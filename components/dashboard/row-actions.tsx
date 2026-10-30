"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Ban, Eye, EyeOff, ShieldCheck, Trash2, XCircle } from "lucide-react";
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
  compact = false,
}: {
  userId: string;
  banned: boolean;
  /** Icon-only variant for dense table rows. */
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ success: boolean }>, okMsg: string) {
    startTransition(async () => {
      try {
        const res = await fn();
        if (res.success) toast.success(okMsg);
        else toast.error("انجام نشد");
      } catch {
        toast.error("خطای دسترسی یا سرور");
      }
    });
  }

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={pending}
        onClick={() =>
          banned
            ? run(() => unbanUser(userId), "رفع مسدودی شد")
            : run(() => toggleUserBan(userId), "کاربر مسدود شد")
        }
        aria-label={banned ? "رفع مسدودی" : "مسدودسازی"}
        title={banned ? "رفع مسدودی" : "مسدودسازی"}
        className={
          banned
            ? "text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
            : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        }
      >
        {pending ? (
          <Spinner className="size-3" />
        ) : banned ? (
          <ShieldCheck className="size-3.5" />
        ) : (
          <Ban className="size-3.5" />
        )}
      </Button>
    );
  }

  if (!banned) {
    return (
      <Button
        variant="outline"
        size="xs"
        disabled={pending}
        onClick={() => run(() => toggleUserBan(userId), "کاربر مسدود شد")}
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
      onClick={() => run(() => unbanUser(userId), "رفع مسدودی شد")}
    >
      رفع مسدودی
    </Button>
  );
}

export function PublishToggleButton({
  listingId,
  published,
  compact = false,
}: {
  listingId: string;
  published: boolean;
  /** Icon-only variant for dense table rows. */
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const label = published ? "لغو انتشار" : "انتشار";

  function run() {
    startTransition(async () => {
      try {
        await setListingPublished(listingId, !published);
        toast.success(published ? "از انتشار خارج شد" : "منتشر شد");
      } catch {
        toast.error("خطای دسترسی یا سرور");
      }
    });
  }

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={pending}
        onClick={run}
        aria-label={label}
        title={label}
        className="text-muted-foreground hover:text-foreground"
      >
        {pending ? (
          <Spinner className="size-3" />
        ) : published ? (
          <EyeOff className="size-3.5" />
        ) : (
          <Eye className="size-3.5" />
        )}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="xs" disabled={pending} onClick={run}>
      {label}
    </Button>
  );
}

export function AdminDeleteButton({
  kind,
  id,
  compact = false,
}: {
  kind: "listing" | "review" | "reservation";
  id: string;
  /** Icon-only variant for dense table rows. */
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function run() {
    if (!window.confirm("مطمئن هستید؟ این عمل بازگشت‌پذیر نیست.")) return;
    startTransition(async () => {
      try {
        let ok = false;
        if (kind === "listing") ok = (await adminDeleteListing(id)).success;
        if (kind === "review") ok = (await adminDeleteReview(id)).success;
        if (kind === "reservation") ok = (await cancelStaleReservation(id)).success;
        if (ok) toast.success("انجام شد");
        else toast.error("انجام نشد");
      } catch {
        toast.error("خطای دسترسی یا سرور");
      }
    });
  }

  const label = kind === "reservation" ? "لغو" : "حذف";

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={pending}
        onClick={run}
        aria-label={label}
        title={label}
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        {pending ? (
          <Spinner className="size-3" />
        ) : kind === "reservation" ? (
          <XCircle className="size-3.5" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="xs"
      disabled={pending}
      onClick={run}
      className="text-destructive"
    >
      {pending ? <Spinner className="size-3" /> : label}
    </Button>
  );
}
