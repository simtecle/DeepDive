import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <Sidebar />
      <div className="flex min-h-[100dvh] flex-col md:pl-[216px]">
        <main className="flex-1 px-4 pb-28 pt-7 sm:px-6 sm:pt-10 md:pb-10 lg:px-10">
          <div className="mx-auto w-full max-w-[1180px]">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
