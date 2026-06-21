// src/app/privacy/page.tsx
import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy | DeepDivePath",
};

export default function PrivacyPage() {
  return (
    <LegalLayout>
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>

      <p className="mt-4 text-[var(--foreground-secondary)]">
        This site is operated from Germany. The full privacy policy is provided in German at{" "}
        <a className="underline" href="/datenschutz">/datenschutz</a>.
        This English page is a convenience summary.
      </p>

      <section className="mt-10 border-t border-neutral-800 pt-8">
        <h2 className="text-xl font-semibold">Cloudflare (Domain / DNS)</h2>
        <p className="mt-3 text-[var(--foreground-secondary)]">
          We use Cloudflare for domain registration and DNS services. This may involve processing technical data
          (e.g., IP address, timestamps, requested domain/record information) to resolve DNS requests and operate the domain.
        </p>
      </section>

      <section className="mt-10 border-t border-neutral-800 pt-8">
        <h2 className="text-xl font-semibold">Vercel Web Analytics</h2>
        <p className="mt-3 text-[var(--foreground-secondary)]">
          If you consent, we use Vercel Web Analytics to measure usage and improve the product. You can withdraw your
          consent at any time via the consent settings.
        </p>
      </section>

      <section className="mt-10 border-t border-neutral-800 pt-8">
        <h2 className="text-xl font-semibold">YouTube Thumbnails</h2>
        <p className="mt-3 text-[var(--foreground-secondary)]">
          We load thumbnail images for linked YouTube videos from YouTube/Google servers (e.g., i.ytimg.com). This request
          may transmit your IP address and technical connection data to the provider.
        </p>
      </section>
    </LegalLayout>
  );
}
