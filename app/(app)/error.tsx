"use client";

import { Alert } from "@/components/ui";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="stack">
      <Alert>Deu ruim, meu nobre. Não carregou.</Alert>
      <button className="button button-secondary" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
