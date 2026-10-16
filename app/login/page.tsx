import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/ui";
import { AuthImageCarousel } from "@/components/auth-image-carousel";

export default async function LoginPage() {
  if (await readSession()) redirect("/inicio");
  return (
    <div className="auth-layout">
      <div className="auth-visual">
        <AuthImageCarousel />
        <Logo />
        <div className="auth-visual-copy">
          <h1>Cursos de extensão do IFCE, num só lugar.</h1>
          <p>
            Inscreva-se, envie seus documentos e acompanhe a análise da sua
            inscrição.
          </p>
        </div>
      </div>
      <div className="auth-panel">
        <LoginForm />
      </div>
    </div>
  );
}
