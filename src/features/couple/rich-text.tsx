// T035 / FR-053: el copy de pareja marca con **…** las palabras que el comp pone en negrita («Yo», «Nosotros»). El texto
// sigue saliendo entero de src/lib/copy/es.ts; aquí solo se pinta.
import { Fragment } from "react";

export function RichText({ text }: { text: string }) {
  return text.split("**").map((part, index) => (index % 2 === 1 ? <b key={index} className="font-semibold text-ink">{part}</b> : <Fragment key={index}>{part}</Fragment>));
}
