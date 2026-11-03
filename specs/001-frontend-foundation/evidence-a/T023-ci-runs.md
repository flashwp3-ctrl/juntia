# T023 · Enlaces y resumen de CI

Los logs completos se consultan en GitHub Actions. Los tiempos de esta tabla
son los publicados por cada job e incluyen instalación; el presupuesto es < 360 s.

| Run | Commit | Job | Resultado | Duración |
| --- | --- | --- | --- | --- |
| [Verde inicial](https://github.com/juntia-labs/juntia/actions/runs/41714775172) | `2f11f31` | lint-typecheck-build | success | 93,38 s |
| Verde inicial | `2f11f31` | vitest | success | 56,30 s |
| Verde inicial | `2f11f31` | a11y | success | 129,98 s |
| [Verde del código final](https://github.com/juntia-labs/juntia/actions/runs/41715893783) | `c1d433e` | lint-typecheck-build | success | 30,32 s |
| Verde del código final | `c1d433e` | vitest | success | 65,01 s |
| Verde del código final | `c1d433e` | a11y | success | 67,69 s |

- [Control negativo](https://github.com/juntia-labs/juntia/actions/runs/41714844048):
  el hex temporal del commit `2df8857` hizo fallar lint; Vitest y axe pasaron.
- [Verde tras git revert](https://github.com/juntia-labs/juntia/actions/runs/41715389696):
  commit `62f7654`, los tres jobs pasaron.
- [Verde del cierre documental](https://github.com/juntia-labs/juntia/actions/runs/41716260319):
  commit `7d50ecf`, los tres jobs pasaron; duraciones publicadas de 69,98 s
  (lint-typecheck-build), 69,85 s (vitest) y 243,24 s (a11y).

Se conservan las capturas, las salidas cortas, `T023-green-summary.txt`,
`T023-green-status.json` y la evidencia del control negativo.
