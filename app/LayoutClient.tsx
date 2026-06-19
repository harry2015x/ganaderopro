"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const ocultarSidebar = pathname === "/login";

  return (
    <div className="flex">
      {!ocultarSidebar && <Sidebar />}

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}