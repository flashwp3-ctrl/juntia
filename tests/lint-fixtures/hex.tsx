// Casos de la regla 7 de ADR-011; el ancla no es un color.
const tone = `color: #1a1c1a`;
export function Fixture() {
  return <a href="#contenido" style={{ color: "#FF0000" }} className="bg-[#123456]">{tone}</a>;
}
