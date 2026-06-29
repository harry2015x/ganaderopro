"use client";

import Link from "next/link";
import NotificationBell from "./NotificationBell";

export default function Header() {
  return (
    <header className=" relative
    z-20
    w-full
    bg-white/80
    backdrop-blur
    border-b
    border-green-100
    px-6
    py-4
    flex
    items-center
    justify-between
    isolate">
      <div>
        <h1 className="text-3xl font-bold text-green-700">
          GanaderoPro
        </h1>

        <p className="text-gray-500 text-sm">
          Sistema de gestión ganadera para la Orinoquía
        </p>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />

        <Link
          href="/usuarios"
          className="h-10 w-10 rounded-full bg-green-700 text-white flex items-center justify-center font-bold"
        >
          H
        </Link>
      </div>
    </header>
  );
}