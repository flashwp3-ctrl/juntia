// 005 · FR-051, FR-071; contracts/cls-comparator.md §3 (F85-5, F85-11). Grabador de fotogramas para el comparador de CLS.
// Script AUTÓNOMO, sin imports: corre antes que la página como `addInitScript` de Playwright y pegado como «Inspector
// Bootstrap Script» de Safari con el Mac (research R11). No escribe nada en la página.
//
// - En cada requestAnimationFrame desde el primero, registra los HTMLElement visibles en el viewport con caja no vacía,
//   hasta 12 niveles bajo body. Excluye script, style, display: contents, SVG y lo que está bajo un aria-hidden dentro de
//   un esqueleto. Identidad por nodo con un WeakMap.
// - Posición de layout: suma de offsetLeft/offsetTop por la cadena de offsetParent, más clientLeft/clientTop de cada
//   antepasado de esa cadena. No incluye transformaciones ni transiciones, ni el scroll (§3.2).
// - Clase normal | fixed | sticky (§3.3), calculada una vez por nodo y recalculada si cambia su `position`.
// - Fotograma `{ t, scroll: [documento, contenedores…], skeleton, main, boxes: [[id, clase, x, y, w, h], …] }` en px CSS
//   enteros. `skeleton`: existe un `[data-skeleton]` (src/components/ui/skeleton.tsx). `main`: existe el `main` de la ruta.
// - Sin texto: ni textContent, ni valores, ni atributos salvo la marca del esqueleto (§3.6). La ruta de un nodo
//   (`etiqueta.clase`) no se graba: la pide el arnés al final con `window.__clsFramesDescribe(ids)` solo para los nodos
//   con desplazamiento, y no forma parte de `window.__clsFrames`.
// - Salida: `window.__clsFrames`, un objeto por carga. Con el Mac: `copy(JSON.stringify(window.__clsFrames))`.
(function () {
  if (window.__clsFrames) return;
  var MAX_DEPTH = 12;
  var AFTER_FINAL = 30; // fotogramas que se siguen grabando después de dos iguales sin esqueleto
  var MAX_FRAMES = 1800;
  var ids = new WeakMap();
  var nodes = new Map();
  var classes = new WeakMap();
  var next = 1;
  var out = { frames: [] };
  window.__clsFrames = out;

  function idOf(el) {
    var id = ids.get(el);
    if (!id) { id = next++; ids.set(el, id); nodes.set(id, new WeakRef(el)); }
    return id;
  }

  function blockClass(el) {
    var own = getComputedStyle(el).position;
    var cached = classes.get(el);
    if (cached && cached.own === own) return cached.value;
    var value = "normal";
    for (var node = el; node && node !== document.documentElement; node = node.parentElement) {
      var position = node === el ? own : getComputedStyle(node).position;
      if (position === "fixed") { value = "fixed"; break; }
      if (position === "sticky") value = "sticky";
    }
    classes.set(el, { own: own, value: value });
    return value;
  }

  function layoutPosition(el) {
    var x = 0, y = 0;
    for (var node = el; node; node = node.offsetParent) {
      x += node.offsetLeft; y += node.offsetTop;
      if (node !== el) { x += node.clientLeft; y += node.clientTop; }
    }
    return [Math.round(x), Math.round(y)];
  }

  function excluded(el) {
    var tag = el.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEMPLATE") return true;
    if (!(el instanceof HTMLElement)) return true; // SVG y otros: cuenta su contenedor HTML
    var hidden = el.closest("[aria-hidden='true']");
    return !!(hidden && hidden.closest("[aria-busy='true']") && hidden.querySelector("[data-skeleton]"));
  }

  function visible(el) {
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
  }

  function snapshot(t) {
    var boxes = [];
    var scroll = [Math.round(scrollY)];
    var stack = [];
    if (document.body) for (var i = document.body.children.length - 1; i >= 0; i--) stack.push([document.body.children[i], 1]);
    while (stack.length) {
      var item = stack.pop(), el = item[0], depth = item[1];
      if (excluded(el)) continue;
      var style = getComputedStyle(el);
      if (style.display === "none") continue;
      var contents = style.display === "contents";
      if (!contents && (style.overflowY === "auto" || style.overflowY === "scroll" || style.overflowX === "auto" || style.overflowX === "scroll") && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)) {
        scroll.push(Math.round(el.scrollTop), Math.round(el.scrollLeft));
      }
      if (!contents && visible(el)) {
        var position = layoutPosition(el);
        boxes.push([idOf(el), blockClass(el), position[0], position[1], el.offsetWidth, el.offsetHeight]);
      }
      if (depth < MAX_DEPTH) for (var c = el.children.length - 1; c >= 0; c--) stack.push([el.children[c], depth + 1]);
    }
    return { t: Math.round(t), scroll: scroll, skeleton: !!document.querySelector("[data-skeleton]"), main: !!document.querySelector("main"), boxes: boxes };
  }

  // Fin de la grabación: AFTER_FINAL fotogramas después del primer final (sin esqueleto, con main y dos fotogramas iguales)
  // que sigue a un esqueleto; en una ruta sin esqueleto (acceso), cuando lleva NO_SKELETON_FRAMES fotogramas y está quieta.
  var NO_SKELETON_FRAMES = 180;
  var stable = -1, seenSkeleton = false;
  function same(a, b) { return a && b && JSON.stringify(a.boxes) === JSON.stringify(b.boxes); }
  function tick(t) {
    if (document.body) {
      var frame = snapshot(t);
      var last = out.frames[out.frames.length - 1];
      out.frames.push(frame);
      if (frame.skeleton) { seenSkeleton = true; stable = -1; }
      var quiet = !frame.skeleton && frame.main && last && !last.skeleton && same(last, frame);
      if (stable < 0 && quiet && (seenSkeleton || out.frames.length >= NO_SKELETON_FRAMES)) stable = out.frames.length;
    }
    if (out.frames.length >= MAX_FRAMES || (stable >= 0 && out.frames.length >= stable + AFTER_FINAL)) { out.done = true; return; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /** El id que el grabador dio a un nodo (para los controles del arnés), o null. */
  window.__clsFramesIdOf = function (el) { return ids.get(el) || null; };

  /** Rutas `etiqueta.clase` de los antepasados de unos ids, solo para el informe del arnés; no se graban (§3.6). */
  window.__clsFramesDescribe = function (list) {
    var result = {};
    list.forEach(function (id) {
      var ref = nodes.get(id), el = ref && ref.deref();
      if (!el || !el.isConnected) { result[id] = "(fuera del DOM)"; return; }
      var parts = [];
      for (var node = el; node && node !== document.body; node = node.parentElement) {
        var first = (node.getAttribute("class") || "").trim().split(/\s+/)[0];
        parts.unshift(node.tagName.toLowerCase() + (first ? "." + first : ""));
      }
      result[id] = parts.join(">");
    });
    return result;
  };
})();
