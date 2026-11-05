// T040 / FR-055; US-7.7: «"Eliminar tu cuenta" aparece como LimitNote de "no disponible", no como botón (§15.6.1)».
// COMPONENT_SPECIFICATIONS.md §LimitNote: «No es un control: sin caret, botón ni badge técnico. `role="note"`».
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { copy } from "@/lib/copy/es";
import { LimitNote } from "./limit-note";

describe("LimitNote (T040)", () => {
  it("es una nota, no un control", () => {
    render(<LimitNote title={copy.account.privacy.deleteTitle} description={copy.account.privacy.deleteDescription} />);
    const note = screen.getByRole("note");
    expect(within(note).getByText(copy.account.privacy.deleteTitle)).toBeTruthy();
    expect(within(note).getByText(copy.account.privacy.deleteDescription)).toBeTruthy();
    expect(within(note).queryAllByRole("button")).toHaveLength(0);
    expect(within(note).queryAllByRole("link")).toHaveLength(0);
    expect(note.querySelectorAll("button, a, input, [tabindex]")).toHaveLength(0);
  });
});
