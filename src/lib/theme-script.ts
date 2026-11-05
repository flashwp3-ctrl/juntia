// Research R2.1 (001): bloqueante antes del body, sin almacenamiento para el tema.
// T046 / FR-052; research R7 (002), con el prototipo de evidence-plan/theme-v-theme-script.ts.txt: la cookie
// `juntia_theme` (light|dark) manda sobre el sistema y deja de seguirlo; sin cookie, `system` o un valor no válido,
// sigue a prefers-color-scheme como en la 001. El servidor nunca pone data-theme.
export const themeScript = '(function(){var d=document.documentElement;var m=window.matchMedia("(prefers-color-scheme: dark)");var t=null;try{var k=document.cookie.match(/(?:^|;\\s*)juntia_theme=(light|dark)(?:;|$)/);if(k){t=k[1]}}catch(e){}function a(){d.setAttribute("data-theme",t||(m.matches?"dark":"light"))}a();if(m.addEventListener){m.addEventListener("change",a)}try{var c=window.localStorage.getItem("juntia:context");if(c==="me"||c==="us"){d.setAttribute("data-context",c)}}catch(e){}})();';
