"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Icon, type IconName } from "@/components/ui/icon";
import { RSLogo, Avatar } from "@/components/ui/primitives";
import { signIn, type SignInState } from "@/lib/auth-actions";

const SLIDES = [
  {
    kicker: "For educators",
    line: "Teach the techniques you wish you’d learned sooner.",
    body: "Build a course, grade real work, and watch your students level up — all from one warm little studio.",
  },
  {
    kicker: "For studios",
    line: "Turn your best stylists into your best teachers.",
    body: "Certifications your whole team can trust, with progress you can actually measure.",
  },
  {
    kicker: "For the craft",
    line: "Small lessons. Sharper hands. Every single day.",
    body: "Micro-learning built for the chair — five minutes between clients is all it takes.",
  },
];

function LeftPanel() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 5200);
    return () => clearInterval(t);
  }, []);

  const s = SLIDES[i];
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        overflow: "hidden",
        background:
          "linear-gradient(158deg, #C75C3C 0%, #A8452A 52%, #6E3324 100%)",
        display: "flex",
        flexDirection: "column",
        padding: "40px 44px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(420px 320px at 82% 8%, rgba(255,255,255,.20), transparent 60%), radial-gradient(360px 300px at 6% 96%, rgba(207,154,71,.28), transparent 62%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.5,
          background:
            "repeating-linear-gradient(48deg, rgba(255,255,255,.04) 0 14px, transparent 14px 30px)",
          mixBlendMode: "screen",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <RSLogo size={22} color="#fff" mark="#fff" />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: 440,
        }}
      >
        <div key={i} className="rs-login-slide">
          <div
            className="rs-eyebrow"
            style={{ color: "rgba(255,255,255,.72)", marginBottom: 16 }}
          >
            {s.kicker}
          </div>
          <h2
            className="rs-display"
            style={{
              margin: 0,
              color: "#fff",
              fontSize: 34,
              lineHeight: 1.08,
              fontWeight: 800,
            }}
          >
            {s.line}
          </h2>
          <p
            style={{
              margin: "18px 0 0",
              color: "rgba(255,255,255,.82)",
              fontSize: 15.5,
              lineHeight: 1.55,
              fontWeight: 500,
            }}
          >
            {s.body}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 32 }}>
          {SLIDES.map((_, n) => (
            <button
              key={n}
              type="button"
              onClick={() => setI(n)}
              aria-label={`Slide ${n + 1}`}
              style={{
                height: 6,
                width: n === i ? 26 : 6,
                borderRadius: 99,
                border: "none",
                cursor: "pointer",
                padding: 0,
                background: n === i ? "#fff" : "rgba(255,255,255,.4)",
                transition: "width .3s ease, background .3s ease",
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: 13,
          paddingTop: 22,
          borderTop: "1px solid rgba(255,255,255,.18)",
        }}
      >
        <Avatar
          name="Rae Mills"
          size={44}
          style={{ boxShadow: "0 0 0 2px rgba(255,255,255,.35)" }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 13.5 }}>
            “I onboarded my whole salon in a weekend.”
          </div>
          <div
            style={{
              color: "rgba(255,255,255,.7)",
              fontSize: 12,
              marginTop: 2,
            }}
          >
            Rae Mills · Master Colorist, Maison Atelier
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  name,
  type = "text",
  placeholder,
  icon,
  autoComplete,
  defaultValue,
  trailing,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  icon?: IconName;
  autoComplete?: string;
  defaultValue?: string;
  trailing?: ReactNode;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: "var(--ink-2)",
          marginBottom: 7,
        }}
      >
        {label}
      </div>
      <div
        style={{
          height: 52,
          borderRadius: 13,
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 14px",
          boxShadow: focus
            ? "0 0 0 2px var(--clay)"
            : "inset 0 0 0 1.5px var(--line-2)",
          transition: "box-shadow .15s ease",
        }}
      >
        {icon && (
          <Icon
            name={icon}
            size={18}
            c={focus ? "var(--clay)" : "var(--ink-3)"}
          />
        )}
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "var(--ui)",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--ink)",
            minWidth: 0,
          }}
        />
        {trailing}
      </div>
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        width: "100%",
        height: 52,
        borderRadius: 13,
        border: "none",
        cursor: pending ? "default" : "pointer",
        background: "var(--clay)",
        color: "#fff",
        fontFamily: "var(--ui)",
        fontWeight: 800,
        fontSize: 15.5,
        letterSpacing: "-.01em",
        boxShadow: "0 8px 20px rgba(199,92,60,.28)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        opacity: pending ? 0.85 : 1,
      }}
    >
      {pending ? (
        <span
          className="rs-login-spin"
          style={{
            width: 18,
            height: 18,
            borderRadius: 99,
            border: "2.5px solid rgba(255,255,255,.4)",
            borderTopColor: "#fff",
            display: "inline-block",
          }}
        />
      ) : (
        <>
          Sign in <Icon name="arrowUR" size={17} c="#fff" />
        </>
      )}
    </button>
  );
}

export function LoginScreen() {
  const [state, formAction] = useActionState<SignInState, FormData>(signIn, {});
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);

  return (
    <div
      className="rs"
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        gridTemplateColumns: "1.05fr 1fr",
        background: "var(--surface)",
      }}
    >
      <LeftPanel />

      <div
        className="rs-noscroll"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          overflowY: "auto",
          background: "var(--paper)",
        }}
      >
        <form action={formAction} style={{ width: "100%", maxWidth: 372 }}>
          <h1
            className="rs-display"
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-.02em",
            }}
          >
            Welcome back
          </h1>
          <p
            style={{
              margin: "8px 0 28px",
              color: "var(--ink-2)",
              fontSize: 14.5,
            }}
          >
            Sign in to your Rockstar studio.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input
              label="Email"
              name="email"
              type="email"
              icon="mail"
              placeholder="you@studio.co"
              autoComplete="username"
              defaultValue="rae@maisonatelier.co"
            />
            <Input
              label="Password"
              name="password"
              type={show ? "text" : "password"}
              icon="lock"
              placeholder="••••••••"
              autoComplete="current-password"
              trailing={
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  title={show ? "Hide" : "Show"}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                  }}
                >
                  <Icon
                    name="eye"
                    size={18}
                    c={show ? "var(--clay)" : "var(--ink-3)"}
                  />
                </button>
              }
            />
          </div>

          {state.error && (
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--clay-deep)",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Icon name="x" size={15} c="var(--clay)" />
              {state.error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              margin: "16px 0 22px",
            }}
          >
            <button
              type="button"
              onClick={() => setRemember((r) => !r)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 0,
                fontFamily: "var(--ui)",
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: remember ? "var(--clay)" : "var(--surface)",
                  boxShadow: remember
                    ? "none"
                    : "inset 0 0 0 1.5px var(--line-2)",
                }}
              >
                {remember && <Icon name="check" size={13} c="#fff" sw={2.6} />}
              </span>
              <span
                style={{
                  fontSize: 13.5,
                  color: "var(--ink-2)",
                  fontWeight: 600,
                }}
              >
                Remember me
              </span>
            </button>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: "var(--clay)",
              }}
            >
              Forgot password?
            </span>
          </div>

          <SubmitButton />

          <p
            style={{
              textAlign: "center",
              margin: "26px 0 0",
              fontSize: 12.5,
              color: "var(--ink-3)",
              lineHeight: 1.6,
            }}
          >
            Demo accounts — any password works
            <br />
            <b style={{ color: "var(--ink-2)" }}>rae@maisonatelier.co</b>{" "}
            (educator) ·{" "}
            <b style={{ color: "var(--ink-2)" }}>admin@rockstar.co</b> (admin)
          </p>
        </form>
      </div>
    </div>
  );
}
