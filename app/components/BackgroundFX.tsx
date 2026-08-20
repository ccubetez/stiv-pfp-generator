"use client";

import { useEffect, useRef } from "react";

/**
 * Интерактивные обои в стиле Frutiger Aero:
 * глянцевые пузыри всплывают вверх, косые лучи света,
 * курсор разгоняет пузыри, клик — лопает.
 */
export default function BackgroundFX() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const mouse = { x: -9999, y: -9999 };

    type Bubble = {
      x: number;
      y: number;
      r: number;
      vy: number; // базовая скорость всплытия
      vx: number;
      wobble: number; // фаза покачивания
      wobbleAmp: number;
      pop: number; // 0 — живой, >0 — анимация лопанья
      hue: number; // 190..210 aqua-синие тона
    };

    const COUNT = Math.min(
      45,
      Math.floor((window.innerWidth * window.innerHeight) / 35000)
    );
    const bubbles: Bubble[] = [];

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(anywhere = false): Bubble {
      const r = 10 + Math.random() * 42;
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + r + Math.random() * 80,
        r,
        vy: 0.25 + Math.random() * 0.55 + r * 0.008,
        vx: 0,
        wobble: Math.random() * Math.PI * 2,
        wobbleAmp: 8 + Math.random() * 18,
        pop: 0,
        hue: 190 + Math.random() * 20,
      };
    }

    resize();
    for (let i = 0; i < COUNT; i++) bubbles.push(spawn(true));

    function onMove(e: PointerEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }
    function onClick(e: PointerEvent) {
      // лопаем пузырь под кликом (ищем ближайший в радиусе)
      for (const b of bubbles) {
        if (b.pop > 0) continue;
        const dx = b.x - e.clientX;
        const dy = b.y - e.clientY;
        if (dx * dx + dy * dy < (b.r + 12) * (b.r + 12)) {
          b.pop = 1;
          break;
        }
      }
    }
    function onResize() {
      resize();
    }

    // Косые лучи света сверху — визитная карточка Frutiger Aero
    function drawLightRays(t: number) {
      ctx!.save();
      ctx!.globalCompositeOperation = "screen";
      for (let i = 0; i < 3; i++) {
        const baseX = w * (0.25 + i * 0.28) + Math.sin(t * 0.1 + i) * 40;
        const grad = ctx!.createLinearGradient(baseX, -50, baseX + w * 0.18, h);
        grad.addColorStop(0, "rgba(140, 210, 255, 0.22)");
        grad.addColorStop(0.6, "rgba(140, 210, 255, 0.07)");
        grad.addColorStop(1, "rgba(160, 220, 255, 0)");
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.moveTo(baseX - 30, -50);
        ctx!.lineTo(baseX + 90, -50);
        ctx!.lineTo(baseX + w * 0.18 + 220, h);
        ctx!.lineTo(baseX + w * 0.18 - 60, h);
        ctx!.closePath();
        ctx!.fill();
      }
      ctx!.restore();
    }

    function drawBubble(b: Bubble, t: number) {
      const x = b.x + Math.sin(t * 0.8 + b.wobble) * b.wobbleAmp * 0.3;
      const y = b.y;

      if (b.pop > 0) {
        // анимация лопанья: расширяющееся кольцо
        const k = b.pop; // 1 → 0
        ctx!.strokeStyle = `hsla(${b.hue}, 90%, 70%, ${k * 0.5})`;
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.arc(x, y, b.r + (1 - k) * 30, 0, Math.PI * 2);
        ctx!.stroke();
        return;
      }

      // тело пузыря — прозрачная aqua-сфера
      const body = ctx!.createRadialGradient(
        x - b.r * 0.3,
        y - b.r * 0.35,
        b.r * 0.1,
        x,
        y,
        b.r
      );
      body.addColorStop(0, `hsla(${b.hue}, 90%, 80%, 0.55)`);
      body.addColorStop(0.55, `hsla(${b.hue}, 85%, 68%, 0.28)`);
      body.addColorStop(0.85, `hsla(${b.hue}, 90%, 58%, 0.42)`);
      body.addColorStop(1, `hsla(${b.hue}, 95%, 50%, 0.55)`);
      ctx!.fillStyle = body;
      ctx!.beginPath();
      ctx!.arc(x, y, b.r, 0, Math.PI * 2);
      ctx!.fill();

      // кромка
      ctx!.strokeStyle = `hsla(${b.hue}, 85%, 55%, 0.6)`;
      ctx!.lineWidth = 1.5;
      ctx!.stroke();

      // главный блик — белый овал слева сверху
      ctx!.save();
      ctx!.translate(x - b.r * 0.38, y - b.r * 0.42);
      ctx!.rotate(-0.6);
      const spec = ctx!.createRadialGradient(0, 0, 0, 0, 0, b.r * 0.32);
      spec.addColorStop(0, "rgba(255, 255, 255, 0.85)");
      spec.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx!.fillStyle = spec;
      ctx!.beginPath();
      ctx!.ellipse(0, 0, b.r * 0.3, b.r * 0.18, 0, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();

      // маленький контр-блик снизу справа (отражение от «воды»)
      const refl = ctx!.createRadialGradient(
        x + b.r * 0.35,
        y + b.r * 0.45,
        0,
        x + b.r * 0.35,
        y + b.r * 0.45,
        b.r * 0.22
      );
      refl.addColorStop(0, `hsla(${b.hue}, 90%, 80%, 0.35)`);
      refl.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx!.fillStyle = refl;
      ctx!.beginPath();
      ctx!.arc(x + b.r * 0.35, y + b.r * 0.45, b.r * 0.22, 0, Math.PI * 2);
      ctx!.fill();
    }

    let t = 0;
    function frame() {
      t += 0.016;
      ctx!.clearRect(0, 0, w, h);

      drawLightRays(t);

      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];

        if (b.pop > 0) {
          b.pop -= 0.05;
          if (b.pop <= 0) bubbles[i] = spawn(); // возрождение снизу
          drawBubble(b, t);
          continue;
        }

        // разгон курсором
        const dx = b.x - mouse.x;
        const dy = b.y - mouse.y;
        const dist2 = dx * dx + dy * dy;
        const R = 130;
        if (dist2 < R * R) {
          const dist = Math.sqrt(dist2) || 1;
          const force = ((R - dist) / R) * 0.35;
          b.vx += (dx / dist) * force;
          b.y -= 0; // вертикаль не трогаем — пузыри всплывают сами
        }

        b.vx *= 0.94;
        b.x += b.vx;
        b.y -= b.vy;

        // улетел наверх — возрождается снизу
        if (b.y < -b.r - 20) bubbles[i] = spawn();
        // не даём уйти далеко по горизонтали
        if (b.x < -b.r - 40) b.x = w + b.r;
        if (b.x > w + b.r + 40) b.x = -b.r;

        drawBubble(b, t);
      }

      raf = requestAnimationFrame(frame);
    }

    function start() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      cancelAnimationFrame(raf);
    }
    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onClick, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    start();

    return () => {
      stop();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onClick);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
