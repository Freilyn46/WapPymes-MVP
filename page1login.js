import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <p className="font-display text-lg font-semibold text-ink">
          CitaFlow
        </p>
        <p className="mt-1 text-sm text-muted">
          Entra a tu panel para gestionar pedidos y citas.
        </p>
      </div>
      <div className="card">
        <LoginForm />
      </div>
    </main>
  );
}