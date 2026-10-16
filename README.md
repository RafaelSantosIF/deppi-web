# DEPPI Web

Primeira versão da plataforma de extensão do IFCE, construída com Next.js 16. Inclui autenticação, cadastro público de alunos, início por permissões, perfil e navegação responsiva.

## Executar

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env.local` e preencha `DEPPI_SESSION_SECRET` com uma chave aleatória de pelo menos 32 caracteres.
3. Inicie com `npm run dev` e abra `http://localhost:3000`.

`DEPPI_API_URL` aponta por padrão para `https://deppi-api.onrender.com`. Todas as chamadas da interface passam pelo servidor Next.js; os tokens ficam em um cookie criptografado `HttpOnly`.

## Rotas

- `/login`: autenticação de alunos e funcionários já cadastrados.
- `/cadastro`: cadastro público exclusivo para alunos.
- `/inicio`: painel conforme as permissões da conta.
- `/perfil`: consulta e autogestão de dados, endereço, foto e senha.
- `/403`: aviso de acesso negado.

Os outros módulos aparecem como “Em breve” apenas para usuários com permissão.

## Verificação

`npm run lint`, `npm run test` e `npm run build`.
