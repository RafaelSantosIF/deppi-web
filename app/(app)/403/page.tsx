import Link from "next/link";
import { Icon } from "@/components/ui";

export default function ForbiddenPage() {
  return (
    <section className="message-page">
      <span className="message-icon">
        <Icon name="warning" size={32} />
      </span>
      <h1>Sem permissão para acessar</h1>
      <p>
        Sua conta não tem acesso a esta página. Se acredita que isso é um
        engano, fale com a equipe DEPPI.
      </p>
      <Link className="button button-primary" href="/inicio">
        Voltar ao início
      </Link>
    </section>
  );
}
