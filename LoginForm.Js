"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = getSupabaseBrowserClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage({ type: "error", text: traducirError(error.message) });
      } else {
        router.push("/admin");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage({ type: "error", text: traducirError(error.message) });
      } else {
        setMessage({
          type: "success",
          text: "Cuenta creada. Ya puedes iniciar sesión.",
        });
        setMode("signin");
      }
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="label-field" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          type="email"
          required
          className="input-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="label-field" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.type === "error" ? "text-red-600" : "text-brand-600"
          }`}
        >
          {message.text}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading
          ? "Un momento…"
          : mode === "signin"
          ? "Iniciar sesión"
          : "Crear cuenta"}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setMessage(null);
        }}
        className="text-center text-sm text-muted hover:text-ink"
      >
        {mode === "signin"
          ? "¿No tienes cuenta? Crea una"
          : "¿Ya tienes cuenta? Inicia sesión"}
      </button>
    </form>
  );
}

function traducirError(msg) {
  if (msg.includes("Invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (msg.includes("User already registered")) {
    return "Ya existe una cuenta con ese correo.";
  }
  return msg;
}