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
    body: "Build a course, grade real work, and watch your students level up — all from one studio.",
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
        background: "var(--red-faint)",
        borderRight: "0.5px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "44px 48px",
      }}
    >
      <div style={{ position: "relative", zIndex: 1 }}>
        <RSLogo size={26} />
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
          <div className="rs-eyebrow" style={{ marginBottom: 18 }}>
            {s.kicker}
          </div>
          <h2
            className="rs-head"
            style={{ margin: 0, fontSize: 36, lineHeight: 1.12 }}
          >
            {s.line}
          </h2>
          <p
            style={{
              margin: "20px 0 0",
              color: "var(--text-secondary)",
              fontSize: 15,
              lineHeight: 1.65,
            }}
          >
            {s.body}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 36 }}>
          {SLIDES.map((_, n) => (
            <button
              key={n}
              type="button"
              onClick={() => setI(n)}
              aria-label={`Slide ${n + 1}`}
              style={{
                height: 3,
                width: n === i ? 26 : 12,
                borderRadius: 99,
                border: "none",
                cursor: "pointer",
                padding: 0,
                background: n === i ? "var(--red)" : "var(--border-strong)",
                transition: "width 0.3s ease, background 0.3s ease",
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
          paddingTop: 24,
          borderTop: "0.5px solid var(--border)",
        }}
      >
        <Avatar name="Rae Mills" size={40} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "var(--text-primary)", fontSize: 13.5, fontStyle: "italic" }}>
            &ldquo;I onboarded my whole salon in a weekend.&rdquo;
          </div>
          <div
            className="rs-word"
            style={{
              color: "var(--text-muted)",
              fontSize: 10,
              letterSpacing: "0.1em",
              marginTop: 4,
            }}
          >
            Rae Mills &middot; Master Colorist, Maison Atelier
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
      <div className="rs-label" style={{ marginBottom: 8 }}>
        {label}
      </div>
      <div
        style={{
          height: 50,
          borderRadius: "var(--r-sm)",
          background: "var(--dark-2)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 14px",
          border: `0.5px solid ${focus ? "var(--red)" : "var(--border-mid)"}`,
          transition: "border-color 0.18s ease",
        }}
      >
        {icon && (
          <Icon
            name={icon}
            size={16}
            c={focus ? "var(--red)" : "var(--text-muted)"}
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
            fontFamily: "var(--font-body)",
            fontSize: 14.5,
            color: "var(--text-primary)",
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
      className="rs-btn-primary"
      style={{
        width: "100%",
        height: 50,
        borderRadius: "var(--r-sm)",
        border: "none",
        cursor: pending ? "default" : "pointer",
        background: "var(--red)",
        color: "var(--cream)",
        fontFamily: "var(--font-word)",
        fontWeight: 200,
        fontSize: 11,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        opacity: pending ? 0.7 : 1,
        transition: "background 0.18s",
      }}
    >
      {pending ? (
        <span
          className="rs-login-spin"
          style={{
            width: 16,
            height: 16,
            borderRadius: 99,
            border: "2px solid rgba(240,237,232,.35)",
            borderTopColor: "var(--cream)",
            display: "inline-block",
          }}
        />
      ) : (
        <>
          {label} <Icon name="arrowUR" size={14} c="var(--cream)" />
        </>
      )}
    </button>
  );
}

/** Which of the four panes the right-hand column is showing. */
type Mode = "signin" | "forgot" | "reset" | "verify";

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
  verify: {
    title: "Confirm it’s you",
    blurb: "This device is new to us. Enter the code we just emailed you.",
    cta: "Verify",
  },
};

export function LoginScreen() {
  // Clerk v7's signals API: `signIn` is null until the client loads, and its
  // methods report failure by returning `{ error }` rather than throwing. They
  // do not report an *incomplete* sign-in that way — that shows up as a
  // status on the resource, which advance() below is what reads.
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

  /**
   * Sends the email code that clears a sign-in waiting on client trust or a
   * second factor, and shows the pane that collects it.
   */
  const askForCode = async () => {
    if (!signIn) return;
    const { error: sendError } = await signIn.mfa.sendEmailCode();
    if (sendError) {
      fail(sendError, "We couldn't send a verification code.");
      return;
    }
    setMode("verify");
    setNotice("We emailed you a verification code.");
    setPending(false);
  };

  /**
   * Shared tail: turn whatever state the sign-in landed in into a session, a
   * next step, or a readable message.
   *
   * A verified first factor is not the end of the flow. This instance has
   * Clerk's Client Trust switched on, so a correct password from a device
   * Clerk doesn't recognise comes back 200, with no error, status
   * `needs_client_trust` and no session — and finalize() *throws* when there is
   * no session to promote. That is what put "Cannot finalize sign-in without a
   * created session" in the console under a form that looked like it was still
   * working. Every status is answered here instead of assuming completion.
   *
   * `canSendCode` is false when we arrive from the code pane, so a code that
   * verifies without completing the sign-in reports that rather than mailing
   * another code and sending the user round the same loop.
   */
  const advance = async (canSendCode = true) => {
    if (!signIn) return;

    switch (signIn.status) {
      case "complete":
        break;
      case "needs_client_trust":
      case "needs_second_factor":
        if (canSendCode) {
          await askForCode();
          return;
        }
        setError("That code didn't finish the sign-in. Try again.");
        setPending(false);
        return;
      case "needs_new_password":
        setError(
          "This account needs a new password. Use “Forgot password?” to set one.",
        );
        setPending(false);
        return;
      default:
        setError(
          `Additional verification is needed to finish signing in (${signIn.status}).`,
        );
        setPending(false);
        return;
    }

    // finalize() throws instead of returning an error when the sign-in has no
    // session, so the throw is caught here rather than escaping as an
    // unhandled rejection that leaves the form spinning.
    try {
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) {
        fail(finalizeError, "We couldn't start your session.");
        return;
      }
    } catch {
      fail({}, "We couldn't start your session.");
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

    await advance();
  };

  const onVerifyCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signIn || pending) return;

    const code = String(new FormData(e.currentTarget).get("code") ?? "").trim();

    setPending(true);
    setError("");
    setNotice("");

    const { error: verifyError } = await signIn.mfa.verifyEmailCode({ code });
    if (verifyError) {
      fail(verifyError, "That code wasn't right.");
      return;
    }

    await advance(false);
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

    await advance();
  };

  const copy = COPY[mode];
  const onSubmit =
    mode === "signin"
      ? onSignIn
      : mode === "forgot"
        ? onSendCode
        : mode === "verify"
          ? onVerifyCode
          : onResetPassword;

  return (
    <div
      className="rs"
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        gridTemplateColumns: "1.05fr 1fr",
        background: "var(--dark)",
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
          background: "var(--dark)",
        }}
      >
        <form
          key={mode}
          method="post"
          onSubmit={onSubmit}
          style={{ width: "100%", maxWidth: 372 }}
        >
          <h1 className="rs-head" style={{ margin: 0, fontSize: 30 }}>
            {copy.title}
          </h1>
          <p
            style={{
              margin: "10px 0 30px",
              color: "var(--text-secondary)",
              fontSize: 14.5,
            }}
          >
            {copy.blurb}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {(mode === "signin" || mode === "forgot") && (
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

            {(mode === "reset" || mode === "verify") && (
              <Input
                label={mode === "verify" ? "Verification code" : "Reset code"}
                name="code"
                type="text"
                icon="mail"
                placeholder="123456"
                autoComplete="one-time-code"
              />
            )}

            {(mode === "signin" || mode === "reset") && (
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
                      size={16}
                      c={show ? "var(--red)" : "var(--text-muted)"}
                    />
                  </button>
                }
              />
            )}
          </div>

          {notice && (
            <div
              style={{
                marginTop: 14,
                fontSize: 13,
                color: "var(--success)",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Icon name="check" size={14} c="var(--success)" />
              {notice}
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 14,
                fontSize: 13,
                color: "var(--danger)",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Icon name="x" size={14} c="var(--danger)" />
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: mode === "signin" ? "flex-end" : "flex-start",
              margin: "18px 0 24px",
            }}
          >
            <button
              type="button"
              onClick={() => goTo(mode === "signin" ? "forgot" : "signin")}
              className="rs-word"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                fontSize: 10.5,
                fontWeight: 200,
                letterSpacing: "0.1em",
                color: "var(--red)",
              }}
            >
              {mode !== "signin" && (
                <Icon name="arrowL" size={13} c="var(--red)" />
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
