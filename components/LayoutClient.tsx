"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

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
  
      <div className="flex-1">
        {!ocultarSidebar && <Header />}
  
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}