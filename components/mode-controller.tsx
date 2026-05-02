"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const COOKING_PREFIXES = ["/plano", "/lista", "/receita/"];

function isCookingRoute(pathname: string): boolean {
  if (pathname === "/plano/novo") return false;
  return COOKING_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function ModeController() {
  const pathname = usePathname() ?? "/";
  useEffect(() => {
    const cooking = isCookingRoute(pathname);
    document.documentElement.dataset.mode = cooking ? "cooking" : "learning";
  }, [pathname]);
  return null;
}
