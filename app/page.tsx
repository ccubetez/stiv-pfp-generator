"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

const DAILY_LIMIT = 5;
const CONTRACT = "F1FqUKK3VCADwP6KWE5UdvZVg7QTHeWj96s4zu6ppump";

type Mode = "dress" | "pfp";

type Usage = { date: string; count: number };

// Счётчик генераций в localStorage
function readUsage(): Usage {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem("stiv_usage");
    if (!raw) return { date: today, count: 0 };
    const parsed = JSON.parse(raw) as Usage;
    if (parsed.date !== today) return { date: today, count: 0 };
    return parsed;
  } catch {
    return { date: today, count: 0 };
  }
}

function bumpUsage() {
  const today = new Date().toISOString().slice(0, 10);
  const u = readUsage();
  const next: Usage = {
    date: today,
    count: u.date === today ? u.count + 1 : 1,
  };
  localStorage.setItem("stiv_usage", JSON.stringify(next));
  return next.count;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("dress");
  const [fields, setFields] = useState({ traits: "", background: "" });
  const [pfp, setPfp] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [used, setUsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUsed(readUsage().count);
  }, []);

  const limitHit = used >= DAILY_LIMIT;

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Need an image file (PNG or JPG).");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Too big — must be under 5MB.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => setPfp(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function generate() {
    if (limitHit) {
      setError(
        "You've summoned 5 STIVs today — even the undying need rest. Come back tomorrow!"
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload =
        mode === "pfp"
          ? { pfp }
          : { traits: fields.traits, background: fields.background };
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setImage(data.image);
      setUsed(bumpUsage());
    } catch {
      setError("Network failed — try again");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = "my-stiv.png";
    a.click();
  }

  const canGenerate =
    !loading &&
    !limitHit &&
    (mode === "pfp" ? !!pfp : !!(fields.traits || fields.background));

  async function copyContract() {
    try {
      await navigator.clipboard.writeText(CONTRACT);
    } catch {
      // fallback для старых браузеров / не-HTTPS
      const ta = document.createElement("textarea");
      ta.value = CONTRACT;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className={styles.shell}>
      <header className={styles.head}>
        <span className={styles.eyebrow}>STIV Dressing Room</span>
        <h1 className={styles.title}>make your undying STIV!</h1>
        <p className={styles.sub}>
          same STIV, new fit. dress him up or stiv-ify your pfp.
          <span className={styles.tagline}>
            he never dies — he just changes outfits.
          </span>
        </p>
      </header>

      <button className={styles.ca} onClick={copyContract} title="copy contract address">
        <span className={styles.caLabel}>CA</span>
        <span className={styles.caAddr}>{CONTRACT}</span>
        <span className={styles.caCopy}>{copied ? "copied!" : "copy"}</span>
      </button>

      <section className={styles.layout}>
        {/* левая колонка — сцена с результатом */}
        <div className={styles.stage}>
          <div className={styles.frame}>
            <img
              className={styles.catImg}
              src={image ?? "/base-character.png"}
              alt="STIV"
            />
            {loading && (
              <div className={styles.loadingWrap}>
                <div className={styles.spinner} />
                <p className={styles.loadingText}>summoning your STIV…</p>
              </div>
            )}
          </div>
          <span className={styles.frameTag}>
            {image ? "your STIV" : "the undying one"}
          </span>
          {image && (
            <button className={styles.download} onClick={download}>
              download your STIV
            </button>
          )}
        </div>

        {/* правая колонка — панель управления */}
        <div className={styles.panel}>
          <div className={styles.tabs}>
            <button
              className={mode === "dress" ? styles.tabActive : styles.tab}
              onClick={() => setMode("dress")}
            >
              dress the STIV
            </button>
            <button
              className={mode === "pfp" ? styles.tabActive : styles.tab}
              onClick={() => setMode("pfp")}
            >
              stiv-ify my pfp
            </button>
          </div>

          {mode === "dress" ? (
            <>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="traits">
                  Traits
                </label>
                <input
                  id="traits"
                  className={styles.input}
                  placeholder="e.g. red bandana, leather jacket, gold chain, eyepatch"
                  value={fields.traits}
                  onChange={(e) =>
                    setFields({ ...fields, traits: e.target.value })
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="background">
                  Background
                </label>
                <input
                  id="background"
                  className={styles.input}
                  placeholder="e.g. neon city alley, sunny beach, graveyard at dawn"
                  value={fields.background}
                  onChange={(e) =>
                    setFields({ ...fields, background: e.target.value })
                  }
                />
              </div>
            </>
          ) : (
            <div className={styles.uploadArea}>
              {pfp ? (
                <div className={styles.pfpPreviewWrap}>
                  <img className={styles.pfpPreview} src={pfp} alt="your pfp" />
                  <button
                    className={styles.changePfp}
                    onClick={() => fileInput.current?.click()}
                  >
                    pick another one
                  </button>
                </div>
              ) : (
                <button
                  className={styles.uploadBtn}
                  onClick={() => fileInput.current?.click()}
                >
                  <span className={styles.uploadPlus}>+</span>
                  upload your pfp
                  <span className={styles.uploadHint}>
                    avatars, pfps & art — not photos of real people
                  </span>
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                hidden
                onChange={onFile}
              />
            </div>
          )}

          <button
            className={styles.generate}
            disabled={!canGenerate}
            onClick={generate}
          >
            {loading ? "summoning…" : "summon your STIV!"}
          </button>

          {error && <p className={styles.error}>{error}</p>}

          <p className={styles.limitNote}>
            {DAILY_LIMIT - used} of {DAILY_LIMIT} summons left today
          </p>
        </div>
      </section>

      <footer className={styles.foot}>STIV never dies · next.js + gemini</footer>
    </main>
  );
}
