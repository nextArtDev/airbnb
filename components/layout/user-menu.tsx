"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Heart,
  Home,
  Inbox,
  LogOut,
  Luggage,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface UserMenuProps {
  userName: string;
  userImage: string | null;
}

export function UserMenu({ userName, userImage }: UserMenuProps) {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  async function signOut() {
    await authClient.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const items = [
    { href: "/trips", label: t("trips"), icon: Luggage },
    { href: "/favorites", label: t("favorites"), icon: Heart },
    { href: "/hostings", label: t("hostings"), icon: Home },
    { href: "/inbox", label: t("inbox"), icon: Inbox },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 rounded-full"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Menu className="size-4" />
        <Avatar className="size-6">
          {userImage ? <AvatarImage src={userImage} alt={userName} /> : null}
          <AvatarFallback className="text-xs">
            {userName.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border bg-popover p-1.5 shadow-lg"
        >
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-accent ${
                pathname === href ? "font-semibold" : ""
              }`}
            >
              <Icon className="size-4 text-muted-foreground" />
              {label}
            </Link>
          ))}
          <div className="my-1 h-px bg-border" />
          <button
            role="menuitem"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm hover:bg-accent"
          >
            <LogOut className="size-4 text-muted-foreground" />
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}

export function LanguageSwitcher() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(locale: "fa" | "en" | "ar") {
    router.replace(pathname, { locale });
  }

  return (
    <div className="flex items-center rounded-full border px-1 py-0.5 text-xs font-medium">
      {(["fa", "en", "ar"] as const).map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => switchTo(locale)}
          className="rounded-full px-2 py-1 uppercase hover:bg-accent"
          aria-label={`${t("language")}: ${locale}`}
        >
          {locale === "fa" ? "فا" : locale}
        </button>
      ))}
    </div>
  );
}
