# Tecnologias empregadas

Todas as versões abaixo são **fixas**, sem intervalo (`^`, `~` ou `latest`).
Uma dependência que pode mudar sozinha entre duas instalações torna o programa
irreproduzível — o que é incompatível com o registro de uma versão determinada.

## Plataforma de execução

| Item | Versão |
|---|---|
| Node.js | 20.9 ou superior |
| PostgreSQL | 17.6 (no ambiente hospedado) — as migrations aplicam a partir do 16 |
| Navegador | Qualquer navegador moderno com suporte a ES2022 |

## Linguagens

| Linguagem | Onde |
|---|---|
| TypeScript 5.9.3 | Aplicação, parsers, validação, testes |
| SQL / PL/pgSQL | Migrations, funções privilegiadas, motor do indicador, testes de banco |
| CSS (Tailwind) | Apresentação |

## Dependências

| Pacote | Versão |
|---|---|
| `@supabase/ssr` | 0.12.7 |
| `@supabase/supabase-js` | 2.116.0 |
| `@tailwindcss/postcss` | 4.3.3 |
| `@types/node` | 26.5.0 |
| `@types/react` | 19.2.18 |
| `@types/react-dom` | 19.2.7 |
| `eslint` | 9.39.5 |
| `eslint-config-next` | 16.3.4 |
| `lucide-react` | 1.43.0 |
| `next` | 16.3.4 |
| `postgres` | 3.4.9 |
| `react` | 19.2.8 |
| `react-dom` | 19.2.8 |
| `supabase` | 2.117.0 |
| `tailwindcss` | 4.3.3 |
| `typescript` | 5.9.3 |
| `vitest` | 5.0.0 |
| `xlsx` | 0.20.3 (distribuição oficial SheetJS, por URL) |
| `zod` | 4.5.4 |

Sobre o `xlsx`: a versão publicada no registro npm sob esse nome está
descontinuada e retém vulnerabilidades conhecidas. A dependência aponta para a
distribuição oficial mantida pelo projeto SheetJS, com versão exata na URL.
`npm audit` reporta **0 vulnerabilidades**.

## Papel de cada peça

| Peça | Papel |
|---|---|
| **Next.js 16 (App Router)** | Renderização no servidor, Server Actions, roteamento. As rotas privadas são todas dinâmicas — não há página privada pré-renderizada |
| **React 19** | Interface |
| **Supabase** | Autenticação (e-mail/senha e Google OAuth), sessão em cookie `httpOnly`, PostgREST sobre o PostgreSQL, Storage privado |
| **PostgreSQL** | Banco, RLS, e **o motor do indicador**. Não é apenas persistência: a regra de cálculo vive aqui |
| **Zod 4** | Validação de entrada e das variáveis de ambiente. O ambiente é validado na inicialização e a aplicação recusa subir mal configurada |
| **SheetJS (`xlsx`)** | Leitura das planilhas XLSX do SIAPS e do PEC |
| **Tailwind CSS 4** | Estilos |
| **Vitest 5** | Testes de unidade |
| **pgTAP** | Testes de banco, com troca real de papel para exercitar o RLS de fato |
| **ESLint 9** | Análise estática |

## Serviços externos

| Serviço | Uso | Dado que recebe |
|---|---|---|
| Supabase | Autenticação, banco e armazenamento | Todo o dado da aplicação |
| Google (OAuth 2.0) | Login opcional por conta Google | Apenas o necessário à autenticação. Nenhum dado clínico é enviado |

Não há serviço de telemetria, análise de comportamento ou publicidade. Nenhum
dado de saúde deixa a infraestrutura do programa.
