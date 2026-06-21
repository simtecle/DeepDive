import { LegalLayout } from '@/components/LegalLayout';

export default function ImpressumPage() {
  return (
    <LegalLayout>
      <div className="space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Impressum</h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            Angaben gemäß § 5 DDG (Deutschland)
          </p>
        </header>

        <section className="space-y-2 text-[var(--foreground-secondary)]">
          <p><strong>Anbieter:</strong> Simon Tecle</p>
          <p>
            <strong>Anschrift:</strong><br />
            Simon Tecle<br />
            c/o flexdienst – #11625<br />
            Kurt-Schumacher-Straße 76<br />
            67663 Kaiserslautern<br />
            Deutschland
          </p>
          <p><strong>E-Mail:</strong> simtec1407@gmail.com</p>
        </section>

        <section className="space-y-2 text-sm text-[var(--foreground-secondary)]">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Haftungsausschluss</h2>
          <p>
            Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt.
            Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte übernehmen wir
            jedoch keine Gewähr.
          </p>
          <p>
            Diese Website enthält ggf. Links zu externen Websites Dritter. Auf die Inhalte
            dieser externen Websites haben wir keinen Einfluss. Für die Inhalte der verlinkten
            Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
          </p>
        </section>

        <hr className="border-neutral-800" />

        <header className="space-y-2">
          <h2 className="text-2xl font-semibold">Imprint</h2>
          <p className="text-sm text-[var(--foreground-muted)]">
            Information pursuant to § 5 DDG (Germany)
          </p>
        </header>

        <section className="space-y-2 text-[var(--foreground-secondary)]">
          <p><strong>Provider:</strong> Simon Tecle</p>
          <p>
            <strong>Address:</strong><br />
            Simon Tecle<br />
            c/o flexdienst – #11625<br />
            Kurt-Schumacher-Straße 76<br />
            67663 Kaiserslautern<br />
            Germany
          </p>
          <p><strong>Email:</strong> simtec1407@gmail.com</p>
        </section>

        <section className="space-y-2 text-sm text-[var(--foreground-secondary)]">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Disclaimer</h2>
          <p>
            The contents of this website have been created with great care. However, we cannot
            guarantee the contents&apos; accuracy, completeness, or timeliness.
          </p>
          <p>
            This website may contain links to external websites. We have no influence over the
            contents of those external websites. Therefore, we cannot accept any liability for
            those external contents. The respective provider or operator of the linked pages is
            always responsible for their content.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}
