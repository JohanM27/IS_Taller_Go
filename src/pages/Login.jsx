import { useState } from "react";
import { Brand } from "../components/Brand";
import { Notice } from "../components/Notice";
import { supabase } from "../services/supabaseClient";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (signInError) {
      setError(`No se pudo iniciar sesion: ${signInError.message}`);
    }

    setLoading(false);
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <Brand variant="login" />
        <form className="form-preview" onSubmit={handleSubmit}>
          <label>
            Correo
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label>
            Contrasena
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>
          {error && <Notice type="error">{error}</Notice>}
          <button className="primary-action" disabled={loading} type="submit">
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}
