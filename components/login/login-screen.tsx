"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { Icon, type IconName } from "@/components/ui/icon";
import { RSLogo, Avatar } from "@/components/ui/primitives";

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

function SubmitButton({
  pending,
  label,
}: {
  pending: boolean;
  label: string;
}) {
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
          {label} <Icon name="arrowUR" size={17} c="#fff" />
        </>
      )}
    </button>
  );
}

/** Which of the three panes the right-hand column is showing. */
type Mode = "signin" | "forgot" | "reset";

const COPY: Record<Mode, { title: string; blurb: string; cta: string }> = {
  signin: {
    title: "Welcome back",
    blurb: "Sign in to your Rockstar studio.",
    cta: "Sign in",
  },
  forgot: {
    title: "Reset your password",
    blurb: "We’ll email you a code to set a new one.",
    cta: "Send code",
  },
  reset: {
    title: "Choose a new password",
    blurb: "Enter the code we emailed you, then pick a new password.",
    cta: "Reset password",
  },
};

export function LoginScreen() {
  // Clerk v7's signals API: `signIn` is null until the client loads, methods
  // return `{ error }` rather than throwing, and status is read off the resource.
  const { signIn } = useSignIn();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");

  const fail = (err: { longMessage?: string; message?: string }, fallback: string) => {
    setError(err.longMessage ?? err.message ?? fallback);
    setPending(false);
  };

  const goTo = (next: Mode) => {
    // reset() clears Clerk's in-flight attempt so a half-finished reset doesn't
    // leak into the next one.
    signIn?.reset();
    setMode(next);
    setError("");
    setNotice("");
    setShow(false);
  };

  /** Shared tail: a complete sign-in becomes an active session. */
  const finalize = async () => {
    if (!signIn) return;
    const { error: finalizeError } = await signIn.finalize();
    if (finalizeError) {
      fail(finalizeError, "We couldn't start your session.");
      return;
    }
    // "/" fans out to the right dashboard once the role is read from Supabase.
    router.push("/");
  };

  const onSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signIn || pending) return;

    const form = new FormData(e.currentTarget);
    const identifier = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setPending(true);
    setError("");

    const { error: passwordError } = await signIn.password({
      identifier,
      password,
    });
    if (passwordError) {
      fail(passwordError, "We couldn't sign you in.");
      return;
    }

    if (signIn.status !== "complete") {
      // Second factor, forced password reset, etc. Say so rather than hang.
      setError(
        `Additional verification is needed to finish signing in (${signIn.status}).`,
      );
      setPending(false);
      return;
    }

    await finalize();
  };

  const onSendCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signIn || pending) return;

    const identifier = String(
      new FormData(e.currentTarget).get("email") ?? "",
    ).trim();

    setPending(true);
    setError("");

    // sendCode() has no params — it mails the identifier on the current
    // attempt, so the attempt has to exist first.
    const { error: createError } = await signIn.create({ identifier });
    if (createError) {
      fail(createError, "We couldn't find that account.");
      return;
    }

    const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
    if (sendError) {
      fail(sendError, "We couldn't send a reset code.");
      return;
    }

    setEmail(identifier);
    setNotice(`We emailed a code to ${identifier}.`);
    setMode("reset");
    setPending(false);
  };

  const onResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signIn || pending) return;

    const form = new FormData(e.currentTarget);
    const code = String(form.get("code") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setPending(true);
    setError("");

    const { error: verifyError } =
      await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (verifyError) {
      fail(verifyError, "That code wasn't right.");
      return;
    }

    const { error: submitError } =
      await signIn.resetPasswordEmailCode.submitPassword({ password });
    if (submitError) {
      fail(submitError, "We couldn't set that password.");
      return;
    }

    if (signIn.status !== "complete") {
      setError(
        `Password reset, but more verification is needed (${signIn.status}).`,
      );
      setPending(false);
      return;
    }

    await finalize();
  };

  const copy = COPY[mode];
  const onSubmit =
    mode === "signin"
      ? onSignIn
      : mode === "forgot"
        ? onSendCode
        : onResetPassword;

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
        <form
          key={mode}
          onSubmit={onSubmit}
          style={{ width: "100%", maxWidth: 372 }}
        >
          <h1
            className="rs-display"
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-.02em",
            }}
          >
            {copy.title}
          </h1>
          <p
            style={{
              margin: "8px 0 28px",
              color: "var(--ink-2)",
              fontSize: 14.5,
            }}
          >
            {copy.blurb}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode !== "reset" && (
              <Input
                label="Email"
                name="email"
                type="email"
                icon="mail"
                placeholder="you@studio.co"
                autoComplete="username"
                defaultValue={email}
              />
            )}

            {mode === "reset" && (
              <Input
                label="Reset code"
                name="code"
                type="text"
                icon="mail"
                placeholder="123456"
                autoComplete="one-time-code"
              />
            )}

            {mode !== "forgot" && (
              <Input
                label={mode === "reset" ? "New password" : "Password"}
                name="password"
                type={show ? "text" : "password"}
                icon="lock"
                placeholder="••••••••"
                autoComplete={
                  mode === "reset" ? "new-password" : "current-password"
                }
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
            )}
          </div>

          {notice && (
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                fontWeight: 600,
                color: "#3E6B4A",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Icon name="check" size={15} c="var(--leaf)" />
              {notice}
            </div>
          )}

          {error && (
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
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: mode === "signin" ? "flex-end" : "flex-start",
              margin: "16px 0 22px",
            }}
          >
            <button
              type="button"
              onClick={() => goTo(mode === "signin" ? "forgot" : "signin")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                fontFamily: "var(--ui)",
                fontSize: 13.5,
                fontWeight: 700,
                color: "var(--clay)",
              }}
            >
              {mode !== "signin" && (
                <Icon name="arrowL" size={15} c="var(--clay)" />
              )}
              {mode === "signin" ? "Forgot password?" : "Back to sign in"}
            </button>
          </div>

          <SubmitButton pending={pending || !signIn} label={copy.cta} />
        </form>
      </div>
    </div>
  );
}
