const E = { out: "cubic-bezier(.4, 0, .2, 1)", in: "cubic-bezier(.2, .8, .2, 1)", spring: "cubic-bezier(.34, 1.56, .64, 1)", lin: "linear" };
const T = (el, frames, dur, delay = 0, ease = E.out, extra = {}) => ({ el, frames, dur, delay, ease, ...extra });
const rnd = (a, b) => a + Math.random() * (b - a);

export const WEIGHT_WORD = ["легко", "средне", "тяжело"];

export const VARIANTS = [
  { id: "none", grp: "Базовые", name: "Мгновенно", w: 0, note: "Без анимации, самый быстрый вариант", run: () => [] },
  { id: "fade", grp: "Базовые", name: "Затухание", w: 0, note: "Одна прозрачность, перекрёстно", run: c => [T(c.o, [{ opacity: 1 }, { opacity: 0 }], 200), T(c.n, [{ opacity: 0 }, { opacity: 1 }], 200)] },
  { id: "zoom", grp: "Базовые", name: "Масштаб", w: 0, note: "Старая отдаляется, новая приближается", run: c => [T(c.o, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.94)" }], 200), T(c.n, [{ opacity: 0, transform: "scale(1.06)" }, { opacity: 1, transform: "none" }], 260, 120, E.in)] },
  { id: "spring", grp: "Базовые", name: "Пружинка", w: 0, note: "Новая выпрыгивает с лёгким отскоком", run: c => [T(c.o, [{ opacity: 1 }, { opacity: 0 }], 140), T(c.n, [{ opacity: 0, transform: "scale(.88) translateY(14px)" }, { opacity: 1, transform: "none" }], 420, 80, E.spring)] },
  { id: "slidex", grp: "Базовые", name: "Слайд вбок", w: 1, note: "Вкладки едут по порядку, как в приложениях; две страницы сразу", run: c => [T(c.o, [{ transform: "none" }, { transform: `translateX(${-c.d * 100}%)` }], 300), T(c.n, [{ transform: `translateX(${c.d * 100}%)` }, { transform: "none" }], 300)] },
  { id: "slidey", grp: "Базовые", name: "Выезд снизу", w: 1, note: "Новая выезжает поверх старой", run: c => [T(c.o, [{ transform: "none", opacity: 1 }, { transform: "scale(.96)", opacity: .4 }], 300), T(c.n, [{ transform: "translateY(100%)" }, { transform: "none" }], 300, 0, E.in)] },
  { id: "curtain", grp: "Базовые", name: "Шторка под меню", w: 1, note: "Старая опускается под меню, потом новая поднимается из-под него", run: c => [T(c.o, [{ transform: "none" }, { transform: "translateY(100%)" }], 220, 0, "cubic-bezier(.5, 0, .9, .4)"), T(c.n, [{ transform: "translateY(100%)" }, { transform: "none" }], 280, 200, E.in)] },
  { id: "stack", grp: "Базовые", name: "Стопка карточек", w: 1, note: "Старая отходит назад, новая накрывает снизу", run: c => [T(c.o, [{ transform: "none", opacity: 1 }, { transform: "translateY(-18px) scale(.92)", opacity: .25 }], 320), T(c.n, [{ transform: "translateY(60%)", opacity: 0 }, { transform: "none", opacity: 1 }], 320, 40, E.in)] },
  { id: "wave", grp: "Базовые", name: "Волна карточек", w: 1, note: "Карточки внутри страницы появляются по очереди", run: c => [T(c.o, [{ opacity: 1 }, { opacity: 0 }], 120), ...c.items().map((el, i) => T(el, [{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }], 260, 80 + i * 45, E.in))] },
  { id: "skeleton", grp: "Базовые", name: "Скелет с бликом", w: 1, note: "Старая гаснет, серые заготовки с бегущим бликом, потом страница", run: c => {
    const sk = c.piece("skel", "inset: 0; padding: 14px 12px; background: #0c0907; opacity: 0; overflow: hidden", `<div style="height:34px;width:50%;margin-bottom:14px;border-radius:12px;background:#1a130e"></div>${'<div style="height:56px;margin-bottom:9px;border-radius:12px;background:#1a130e"></div>'.repeat(6)}<div class="sheen" style="position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(233,199,122,.12) 50%,transparent 70%)"></div>`);
    const sheen = sk.querySelector(".sheen");
    return [T(c.o, [{ opacity: 1 }, { opacity: 0 }], 140), T(sk, [{ opacity: 0 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0 }], 520, 60, E.lin), T(sheen, [{ transform: "translateX(-100%)" }, { transform: "translateX(100%)" }], 520, 60, E.lin), T(c.n, [{ opacity: 0 }, { opacity: 1 }], 220, 460, E.in)];
  } },
  { id: "blur", grp: "Базовые", name: "Размытие", w: 2, note: "Фильтр blur: красиво, но тяжело для слабых", run: c => [T(c.o, [{ opacity: 1, filter: "blur(0)" }, { opacity: 0, filter: "blur(8px)" }], 300), T(c.n, [{ opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0)" }], 300)] },
  { id: "flip", grp: "Базовые", name: "Переворот (3D)", w: 2, note: "Страница поворачивается ребром, нужна 3D-сцена", persp: true, run: c => [T(c.o, [{ transform: "rotateY(0)" }, { transform: `rotateY(${-c.d * 90}deg)` }], 190, 0, "cubic-bezier(.5, 0, 1, .6)"), T(c.n, [{ transform: `rotateY(${c.d * 90}deg)` }, { transform: "rotateY(0)" }], 230, 180, E.in)] },
  { id: "cube", grp: "Базовые", name: "Куб (3D)", w: 2, note: "Две грани куба поворачиваются вместе", persp: true, run: c => [T(c.o, [{ transform: "none" }, { transform: `translateX(${-c.d * 100}%) rotateY(${-c.d * 90}deg)` }], 420, 0, E.out, { origin: `${c.d > 0 ? 100 : 0}% 50%` }), T(c.n, [{ transform: `translateX(${c.d * 100}%) rotateY(${c.d * 90}deg)` }, { transform: "none" }], 420, 0, E.out, { origin: `${c.d > 0 ? 0 : 100}% 50%` })] },
  { id: "circle", grp: "Базовые", name: "Раскрытие кругом", w: 2, note: "Новая раскрывается кругом от вкладки: обрезка пересчитывается каждый кадр", run: c => [T(c.n, [{ clipPath: `circle(0 at ${c.x}% 100%)` }, { clipPath: `circle(150% at ${c.x}% 100%)` }], 480, 0, E.in)] },
  { id: "book", grp: "Тематичные, в духе листа D&D", name: "Страница книги", w: 2, note: "Вперёд страницы листаются влево, назад падают слева обратно; при прыжке через несколько вкладок листы перелистываются веером (3D)", persp: true, run: c => {
    const k = Math.abs(c.to - c.from);
    const fwd = c.d > 0;
    const total = k === 1 ? 1 : Math.min(3 + k * 2, 11);
    const mids = [];
    if (fwd) for (let i = c.from + 1; i < c.to; i++) mids.push(i);
    else for (let i = c.from - 1; i > c.to; i--) mids.push(i);
    const sheets = [];
    if (fwd) {
      sheets.push(c.o);
      for (let i = 0; sheets.length < total && mids.length; i++) sheets.push(c.sheet(mids[i % mids.length]));
    } else {
      for (let i = 0; sheets.length < total - 1 && mids.length; i++) sheets.push(c.sheet(mids[i % mids.length]));
      sheets.push(c.n);
    }
    const m = sheets.length;
    sheets.forEach((el, i) => {
      el.style.backfaceVisibility = "hidden";
      el.style.zIndex = fwd ? 2 + m - i : 2 + i;
    });
    if (fwd) c.n.style.zIndex = 2;
    else c.o.style.zIndex = 1;
    const dur = 560;
    const st = k === 1 ? 0 : Math.max(40, Math.min(110, 760 / m));
    const end = (m - 1) * st + dur + 80;
    const spine = c.piece("spine", "left: 0; top: 0; bottom: 0; width: 18px; background: linear-gradient(90deg, rgba(0, 0, 0, .6), rgba(0, 0, 0, 0))");
    const out = [T(spine, [{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 1, offset: .9 }, { opacity: 0 }], end, 0, E.lin)];
    sheets.forEach((el, i) => {
      const under = fwd ? sheets[i + 1] || c.n : i === 0 ? c.o : sheets[i - 1];
      const shade = c.shadeOn(under);
      const last = i === m - 1;
      if (fwd) {
        out.push(T(el, [
          { transform: "translateZ(0px) rotateY(0deg)", easing: "cubic-bezier(.4, 0, .8, .6)" },
          { transform: "translateZ(46px) rotateY(-54deg)", offset: .45, easing: "cubic-bezier(.2, .5, .4, 1)" },
          { transform: "translateZ(8px) rotateY(-104deg)" }
        ], dur, i * st, E.lin, { origin: "0% 50%" }));
        out.push(T(shade, [{ opacity: 0 }, { opacity: .85, offset: .45 }, { opacity: 0 }], dur, i * st, E.lin));
        c.sfx("cloth", i * st + 60, .5, 1.15 + rnd(0, .2));
      } else {
        out.push(T(el, [
          { transform: "translateZ(8px) rotateY(-104deg)", easing: "cubic-bezier(.55, 0, 1, .55)" },
          { transform: "translateZ(0px) rotateY(0deg)", offset: .78, easing: "ease-out" },
          { transform: "translateZ(0px) rotateY(-5deg)", offset: .9, easing: "ease-in" },
          { transform: "translateZ(0px) rotateY(0deg)" }
        ], dur + (last ? 80 : 0), i * st, E.lin, { origin: "0% 50%" }));
        out.push(T(shade, [{ opacity: 0 }, { opacity: 0, offset: .55 }, { opacity: .85, offset: .8 }, { opacity: 0 }], dur, i * st, E.lin));
        c.sfx("cloth", i * st + dur * .78, last ? .9 : .5, last ? .85 : 1.1);
      }
    });
    return out;
  } },
  { id: "smoke", grp: "Тематичные, в духе листа D&D", name: "Дым и искры", w: 1, note: "Старая рассеивается тёмным дымом, вверх летят золотые искры", run: c => {
    const out = [T(c.o, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-16px) scale(1.05)" }], 360), T(c.n, [{ opacity: 0 }, { opacity: 1 }], 300, 240, E.in)];
    for (let i = 0; i < 7; i++) {
      const sz = rnd(130, 230);
      const el = c.piece("smoke", `left: ${rnd(-5, 85)}%; top: ${rnd(35, 85)}%; width: ${sz}px; height: ${sz}px; margin: ${-sz / 2}px 0 0 ${-sz / 2}px; border-radius: 50%; background: radial-gradient(circle, rgba(70, 55, 45, .9), rgba(70, 55, 45, 0) 70%)`);
      out.push(T(el, [{ opacity: 0, transform: "translateY(30px) scale(.5)" }, { opacity: .9, transform: "translateY(-30px) scale(1)", offset: .4 }, { opacity: 0, transform: "translateY(-110px) scale(1.5)" }], rnd(520, 720), rnd(0, 160), E.out));
    }
    for (let i = 0; i < 22; i++) {
      const el = c.piece("spark", `left: ${rnd(5, 95)}%; top: ${rnd(40, 95)}%; width: 5px; height: 5px; border-radius: 50%; background: #ffe3a0; box-shadow: 0 0 8px #e9c77a`);
      out.push(T(el, [{ opacity: 0, transform: "translate(0, 0) scale(.4)" }, { opacity: 1, offset: .25 }, { opacity: 0, transform: `translate(${rnd(-50, 50)}px, ${rnd(-190, -70)}px) scale(.2)` }], rnd(500, 850), rnd(0, 220), E.out));
    }
    return out;
  } },
  { id: "seal", grp: "Тематичные, в духе листа D&D", name: "Печать", w: 0, note: "От кубика расходятся два золотых кольца, страница меняется под ними", run: c => {
    const k = (Math.hypot(c.w, c.h) * 2) / 100;
    const ring = (b, o) => c.piece("ring", `left: ${c.x}%; top: 100%; width: 100px; height: 100px; margin: -50px 0 0 -50px; border-radius: 50%; border: ${b}px solid #e9c77a; box-shadow: 0 0 24px rgba(233, 199, 122, ${o}), inset 0 0 24px rgba(233, 199, 122, ${o * .6})`);
    return [
      T(c.o, [{ opacity: 1 }, { opacity: 0 }], 300, 100),
      T(c.n, [{ opacity: 0, transform: "scale(.97)" }, { opacity: 1, transform: "none" }], 320, 180, E.in),
      T(ring(4, .8), [{ transform: "scale(0)", opacity: 1 }, { transform: `scale(${k})`, opacity: 0 }], 520, 0, E.out),
      T(ring(2, .6), [{ transform: "scale(0)", opacity: .9 }, { transform: `scale(${k * .8})`, opacity: 0 }], 520, 90, E.out)
    ];
  } },
  { id: "portal", grp: "Тематичные, в духе листа D&D", name: "Магический портал", w: 2, note: "Новая раскрывается кругом из кубика, по краю вращаются два кольца рун", run: c => {
    const R = Math.round(Math.hypot(c.w, c.h) * 1.05);
    const k = (R * 2) / 100;
    const ring = (b, kind, col) => c.piece("ring", `left: ${c.x}%; top: 100%; width: 100px; height: 100px; margin: -50px 0 0 -50px; border-radius: 50%; border: ${b}px ${kind} ${col}; box-shadow: 0 0 22px ${col}, inset 0 0 22px ${col}`);
    return [
      T(c.n, [{ clipPath: `circle(0px at ${c.x}% 100%)` }, { clipPath: `circle(${R}px at ${c.x}% 100%)` }], 560, 0, E.lin),
      T(ring(3, "dashed", "#e9c77a"), [{ transform: "scale(0) rotate(0deg)", opacity: 1 }, { transform: `scale(${k}) rotate(200deg)`, opacity: 1, offset: .95 }, { transform: `scale(${k}) rotate(220deg)`, opacity: 0 }], 560, 0, E.lin),
      T(ring(2, "dotted", "#c07cff"), [{ transform: "scale(0) rotate(0deg)", opacity: 1 }, { transform: `scale(${k * .93}) rotate(-260deg)`, opacity: 1, offset: .95 }, { transform: `scale(${k * .93}) rotate(-280deg)`, opacity: 0 }], 560, 0, E.lin)
    ];
  } },
  { id: "deck", grp: "Весёлые", name: "Колода карт", w: 1, note: "Верхняя карта смахивается в сторону, под ней поднимается следующая", oldTop: true, run: c => [
    T(c.o, [{ transform: "none", opacity: 1 }, { transform: `translate(${-c.d * 48}%, 12%) rotate(${-c.d * 10}deg) scale(.88)`, opacity: 0 }], 400, 0, "cubic-bezier(.4, 0, .8, .5)"),
    T(c.n, [{ transform: "translateY(14px) scale(.93)", opacity: .5 }, { transform: "none", opacity: 1 }], 400, 60, E.in)
  ] },
  { id: "dice", grp: "Весёлые", name: "Падение костей", w: 1, note: "Кубики падают, трижды отскакивают со стуком и остаются лежать на столе, пока меняется страница", run: c => {
    const colors = ["#e9c77a", "#d4624e", "#7b8be6", "#59b46b", "#c07cff"];
    const out = [T(c.o, [{ opacity: 1 }, { opacity: 0 }], 260, 150), T(c.n, [{ opacity: 0 }, { opacity: 1 }], 380, 760, E.in)];
    c.sfx("throw", 0, .55, 1);
    for (let i = 0; i < 10; i++) {
      const sz = rnd(36, 56);
      const x0 = rnd(6, Math.max(7, c.w - sz - 6));
      const g = c.h - sz - rnd(8, 80);
      const h1 = rnd(80, 130);
      const h2 = h1 * .42;
      const h3 = h2 * .4;
      const dx = () => rnd(-26, 26);
      const spin = rnd(300, 640) * (Math.random() < .5 ? -1 : 1);
      const dur = rnd(1000, 1250);
      const delay = rnd(0, 280);
      const el = c.piece("die", `left: ${x0}px; top: 0; width: ${sz}px; height: ${sz}px; --c: ${colors[i % colors.length]}`, `<b>${1 + Math.floor(Math.random() * 20)}</b>`);
      const at = (t, y, x, r, easing) => ({ transform: `translate(${x}px, ${y}px) rotate(${r}deg)`, offset: t, easing });
      out.push(T(el, [
        { transform: `translate(0px, ${-sz - 10}px) rotate(0deg)`, offset: 0, easing: "cubic-bezier(.5, 0, 1, .7)" },
        at(.4, g, dx(), spin * .45, "cubic-bezier(0, .4, .5, 1)"),
        at(.54, g - h1, dx(), spin * .7, "cubic-bezier(.5, 0, 1, .7)"),
        at(.68, g, dx(), spin * .88, "cubic-bezier(0, .4, .5, 1)"),
        at(.78, g - h2, dx() * .5, spin * .96, "cubic-bezier(.5, 0, 1, .7)"),
        at(.86, g, dx() * .4, spin, "cubic-bezier(0, .4, .5, 1)"),
        at(.92, g - h3, dx() * .2, spin, "cubic-bezier(.5, 0, 1, .7)"),
        at(1, g, 0, spin, "linear")
      ], dur, delay, E.lin));
      out.push(T(el, [{ opacity: 1 }, { opacity: 1, offset: .55 }, { opacity: 0 }], 520, delay + dur + 140, E.lin));
      c.sfx("clack", delay + dur * .4, .55 + rnd(0, .3), .85 + rnd(0, .35));
      c.sfx("clack", delay + dur * .68, .3 + rnd(0, .2), .95 + rnd(0, .4));
    }
    return out;
  } }
];

export const variantById = id => VARIANTS.find(v => v.id === id) || null;

export function playFx(v, o) {
  const { stage, d, from, to, count, slow = 1 } = o;
  const extra = [];
  const add = el => {
    stage.append(el);
    extra.push(el);
    return el;
  };
  const c = {
    o: o.o,
    n: o.n,
    d,
    from,
    to,
    x: Math.round(((to + .5) / count) * 100),
    w: stage.clientWidth,
    h: stage.clientHeight,
    piece: (cls, css, html = "") => {
      const el = document.createElement("div");
      el.className = "fx " + cls;
      el.style.cssText = css;
      el.innerHTML = html;
      return add(el);
    },
    shadeOn: parent => {
      const el = document.createElement("div");
      el.className = "fx shade";
      el.style.cssText = "inset: 0; opacity: 0; background: linear-gradient(90deg, rgba(0, 0, 0, .7), rgba(0, 0, 0, 0) 70%)";
      parent.append(el);
      extra.push(el);
      return el;
    },
    sheet: i => add(o.sheet(i)),
    items: () => (o.items ? o.items(c.n) : []),
    sfx: (kind, delay, vol, rate) => {
      if (o.sound) o.sound(kind, delay * slow, vol, rate);
    }
  };
  c.n.style.zIndex = v.oldTop ? 1 : 2;
  c.o.style.zIndex = v.oldTop ? 2 : 1;
  if (v.persp) {
    stage.style.perspective = "1100px";
    c.o.style.backfaceVisibility = "hidden";
    c.n.style.backfaceVisibility = "hidden";
  }
  const tracks = v.run(c);
  const anims = tracks.map(t => {
    if (t.origin) t.el.style.transformOrigin = t.origin;
    return t.el.animate(t.frames, { duration: t.dur * slow, delay: t.delay * slow, easing: t.ease, fill: "both" });
  });
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    anims.forEach(a => {
      try {
        a.finish();
      } catch {}
    });
    anims.forEach(a => a.cancel());
    [c.o, c.n].forEach(p => {
      p.style.transformOrigin = "";
      p.style.zIndex = "";
      p.style.backfaceVisibility = "";
    });
    stage.style.perspective = "";
    extra.forEach(e => e.remove());
    if (o.onEnd) o.onEnd();
  };
  const done = anims.length ? Promise.all(anims.map(a => a.finished)).then(finish, finish) : Promise.resolve().then(finish);
  return { finish, done };
}
