// T038 / FR-049, FR-050: cada primitivo del paso 2 del handoff en sus estados, dentro de un tema anidado.
// Valores de prueba solo de COMPONENT_SPECIFICATIONS.md (tope 999.999.999, textos de Badge); ninguna cifra de una persona.
import type { ReactNode } from "react";
import { AmountInput } from "@/components/ui/amount-input";
import { AppIcon, type AppIconName, type AppIconWeight } from "@/components/ui/app-icon";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeStatus } from "@/components/ui/badge";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { CategoryIcon, categories, type Category } from "@/components/ui/category-icon";
import { Input } from "@/components/ui/input";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { copy } from "@/lib/copy/es";
import { SegmentedDemo } from "./segmented-demo";

const t = copy.internal;
const weights: readonly AppIconWeight[] = ["regular", "fill", "bold", "duotone"];
const showcaseIcons: readonly AppIconName[] = ["house-simple", "receipt", "flag-banner", "chart-pie-slice", "scales", "user-circle", "plus", "tray"];
const statusIcons: readonly AppIconName[] = ["warning", "warning-circle", "check-circle", "clock", "lock-simple", "caret-left"];
const badgeStatuses: readonly BadgeStatus[] = ["pending", "settled", "exceeded", "nearLimit", "private"];
const buttonVariants: readonly ButtonVariant[] = ["primary", "secondary", "ghost", "danger"];
const categoryKeys = Object.keys(categories) as Category[];

// Los campos se muestran sobre surface.overlay, la superficie de las hojas y diálogos donde viven (§BottomSheet, §Modal).
function Card({ title, hint, wide = false, surface = "raised", children }: { title: string; hint: string; wide?: boolean; surface?: "raised" | "overlay"; children: ReactNode }) {
  const look = surface === "overlay" ? "bg-overlay shadow-raised" : "bg-raised shadow-raised";
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-[var(--radius-2xl)] p-5 md:p-6 ${look} ${wide ? "md:col-span-2" : ""}`}>
      <div className="flex flex-col gap-1">
        <h3 className="text-[length:var(--overline-size)] font-semibold tracking-[var(--overline-tracking)] text-ink-secondary uppercase">{title}</h3>
        <p className="text-[length:var(--body-s-size)] leading-[var(--body-s-line)] text-ink-secondary text-pretty">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[length:var(--meta-mono-size)] leading-[var(--meta-mono-line)] text-ink-secondary">{children}</span>;
}

export function PrimitivesGallery({ theme }: { theme: "light" | "dark" }) {
  const name = theme === "light" ? t.light : t.dark;
  const headingId = `tema-${theme}`;
  return (
    <section data-theme={theme} aria-labelledby={headingId} className="flex min-w-0 flex-col gap-5 rounded-[var(--radius-3xl)] bg-canvas p-4 text-ink ring-1 ring-border md:p-6">
      <h2 id={headingId} className="flex items-baseline gap-3 border-t border-ink pt-3 font-serif text-[length:var(--title-l-size)] leading-none">
        {name}
      </h2>
      <div className="grid gap-5 md:grid-cols-2">
        <Card title={t.sections.icon} hint={t.hints.icon} wide>
          <div className="flex flex-col gap-3 md:grid md:grid-cols-[auto_1fr] md:items-center md:gap-x-4">
            {weights.map((weight) => (
              <div key={weight} className="flex flex-col gap-2 md:contents">
                <Caption>{t.weights[weight]}</Caption>
                <div className="flex flex-wrap gap-3 text-ink">
                  {[...showcaseIcons, ...statusIcons.slice(0, weight === "regular" ? 6 : 0)].map((icon) => (
                    <AppIcon key={icon} name={icon} weight={weight} size={24} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title={t.sections.avatar} hint={t.hints.avatar}>
          <div className="flex flex-col gap-3">
            {([1, 2] as const).map((person) => (
              <div key={person} className="flex items-center gap-3">
                {([16, 24, 32, 40] as const).map((size) => (
                  <Avatar key={size} person={person} size={size} initial={person === 1 ? t.persons.firstInitial : t.persons.secondInitial} />
                ))}
                <Caption>{person === 1 ? t.persons.first : t.persons.second}</Caption>
              </div>
            ))}
          </div>
        </Card>

        <Card title={t.sections.badge} hint={t.hints.badge}>
          <div className="flex flex-wrap gap-2">
            {badgeStatuses.map((status) => <Badge key={status} status={status} />)}
          </div>
        </Card>

        <Card title={t.sections.category} hint={t.hints.category} wide>
          <div className="flex flex-wrap items-end gap-5">
            {(["sm", "md", "lg", "xl"] as const).map((size) => (
              <div key={size} className="flex flex-col items-center gap-2">
                <CategoryIcon kind="category" category="market" size={size} />
                <Caption>{t.sizes[size]}</Caption>
              </div>
            ))}
            <div className="flex flex-col items-center gap-2">
              <CategoryIcon kind="category" category="home" size="md" selected />
              <Caption>{t.shapes.selected}</Caption>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {categoryKeys.map((category) => (
              <div key={category} className="flex min-w-0 flex-col items-center gap-2 text-center">
                <CategoryIcon kind="category" category={category} size="lg" />
                <span className="w-full truncate text-[length:var(--label-s-size)] font-medium text-ink-secondary">{t.categories[category]}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-5">
            <div className="flex items-center gap-3"><CategoryIcon kind="category" category="shopping" /><Caption>{t.shapes.square}</Caption></div>
            <div className="flex items-center gap-3"><CategoryIcon kind="saving" /><Caption>{t.shapes.saving}</Caption></div>
            <div className="flex items-center gap-3"><CategoryIcon kind="settlement" /><Caption>{t.shapes.settlement}</Caption></div>
          </div>
        </Card>

        <Card title={t.sections.button} hint={t.hints.button} wide>
          <div className="flex flex-col gap-3">
            <div aria-hidden="true" className="hidden md:grid md:grid-cols-[72px_1fr] md:gap-3">
              <span />
              <Caption>{`${t.states.normal} · ${t.states.disabled} · ${t.states.loading}`}</Caption>
            </div>
            {buttonVariants.map((variant) => (
              <div key={variant} className="flex flex-col gap-2 md:grid md:grid-cols-[72px_1fr] md:items-center md:gap-3">
                <Caption>{t.variants[variant]}</Caption>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button variant={variant}>{t.actions[variant]}</Button>
                  <Button variant={variant} disabled>{t.actions[variant]}</Button>
                  <Button variant={variant} loading loadingLabel={t.actions[`${variant}Loading`]}>{t.actions[variant]}</Button>
                </div>
              </div>
            ))}
            <div className="flex flex-col gap-2 border-t border-border pt-3 md:grid md:grid-cols-[72px_1fr] md:items-center md:gap-3">
              <Caption>{t.sizesLabel}</Caption>
              <div className="flex flex-wrap items-center gap-2.5">
                {(["sm", "md", "lg"] as const).map((size) => (
                  <Button key={size} size={size} variant="secondary" icon="plus">{t.buttonSizes[size]}</Button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card title={t.sections.input} hint={t.hints.input} surface="overlay">
          <Input label={t.input.label} placeholder={t.input.placeholder} />
          <Input label={t.input.label} help={t.input.help} />
          <Input label={t.input.label} error={t.input.error} />
          <Input label={t.input.disabled} defaultValue={t.input.disabledValue} disabled />
        </Card>

        <Card title={t.sections.amount} hint={t.hints.amount} surface="overlay">
          <AmountInput label={`${copy.primitives.amount} · ${t.amount.empty}`} help={copy.primitives.amountHelp} />
          <AmountInput label={`${copy.primitives.amount} · ${t.amount.max}`} defaultValue={999999999} />
          <AmountInput label={`${copy.primitives.amount} · ${t.amount.error}`} error={copy.primitives.amountError} />
          <div className="w-[240px] max-w-full">
            <AmountInput label={`${copy.primitives.amount} · ${t.amount.long}`} defaultValue={999999999} />
          </div>
        </Card>

        <Card title={t.sections.segmented} hint={t.hints.segmented}>
          <SegmentedDemo />
        </Card>

        <Card title={t.sections.skeleton} hint={t.hints.skeleton}>
          <SkeletonGroup label={copy.primitives.loading} className="flex flex-col gap-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="grid h-[60px] grid-cols-[40px_1fr_70px] items-center gap-3">
                <Skeleton width={40} height={40} radius="32%" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton width="70%" height={12} />
                  <Skeleton width="45%" height={10} radius="5px" />
                </div>
                <Skeleton width={70} height={12} />
              </div>
            ))}
            <Skeleton height={228} radius="var(--radius-2xl)" />
          </SkeletonGroup>
          <Caption>{`${t.skeleton.row} · ${t.skeleton.card}`}</Caption>
        </Card>
      </div>
    </section>
  );
}
