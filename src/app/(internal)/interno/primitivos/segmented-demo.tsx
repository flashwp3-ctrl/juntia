"use client";
// T038: Segmented en sus dos roles, con estado local. Solo para la superficie interna.
import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { copy } from "@/lib/copy/es";

export function SegmentedDemo() {
  const [context, setContext] = useState<"me" | "us">("me");
  const [split, setSplit] = useState<"even" | "percent" | "fixed">("even");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[length:var(--meta-mono-size)] text-ink-secondary">{copy.internal.segmented.radiogroup}</span>
        <Segmented
          role="radiogroup"
          label={copy.context.label}
          value={context}
          onValueChange={setContext}
          options={[{ value: "me", label: copy.context.me }, { value: "us", label: copy.context.us }]}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[length:var(--meta-mono-size)] text-ink-secondary">{copy.internal.segmented.tablist}</span>
        <Segmented
          role="tablist"
          stretch
          label={copy.internal.segmented.split}
          value={split}
          onValueChange={setSplit}
          options={[
            { value: "even", label: copy.internal.segmented.even },
            { value: "percent", label: copy.internal.segmented.percent },
            { value: "fixed", label: copy.internal.segmented.fixed },
          ]}
        />
      </div>
    </div>
  );
}
