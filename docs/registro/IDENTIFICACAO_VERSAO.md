# Identificação da versão

## Programa

| Campo | Conteúdo |
|---|---|
| **Nome** | Cuidado na Gestação na APS |
| **Versão** | 3.0 |
| **Natureza** | Programa de computador aplicado à saúde pública, para monitoramento do cuidado pré-natal na Atenção Primária à Saúde |
| **Campo de aplicação** | Gestão e monitoramento de indicadores da APS; acompanhamento clínico de gestantes por profissional de saúde |
| **Linguagem principal** | TypeScript, com regras de cálculo e autorização em SQL (PL/pgSQL) |
| **Tipo de programa** | Aplicação web, arquitetura cliente-servidor, com banco de dados relacional |
| **Sistema operacional** | Independente — executa em qualquer ambiente com Node.js 20.9 ou superior; o cliente é um navegador |

## Autoria e vínculo institucional

| Campo | Conteúdo |
|---|---|
| **Desenvolvido por** | Lucca Araújo |
| **Programa institucional** | PET-Saúde |
| **Instituição** | Universidade Federal de Campina Grande — UFCG |
| **Localidade** | Campina Grande — Paraíba, Brasil |
| **Município de aplicação** | Campina Grande — PB (código IBGE 250400) |

## Versão registrada

| Campo | Conteúdo |
|---|---|
| **Ramo de desenvolvimento** | `claude/v3-usable-rc` |
| **Ramo base** | `codex/bootstrap-v3` |
| **Data de encerramento desta versão** | 2026-09-09 |
| **Início do desenvolvimento da V3** | 2026-09-08 |

O identificador exato do commit, o resumo SHA-256 do pacote e a lista completa
de arquivos estão em `MANIFESTO_REGISTRO.md`, gerado pelo script
`scripts/gerar-pacote-registro.sh` no momento em que o pacote é produzido. Esta
separação é deliberada: um documento escrito à mão pode divergir do código; o
manifesto é derivado do próprio conteúdo empacotado.

## Relação com versões anteriores

A V3 é uma reescrita, não uma evolução incremental. As versões anteriores da
plataforma não compartilham banco de dados, esquema de autorização nem base de
código com esta. Nenhum dado, credencial ou migração das versões anteriores é
reaproveitado. Os motivos e o alcance da reescrita estão em `CHANGELOG_V3.md`.

## Fundamentação normativa

O indicador calculado por esta versão é o **C3 — Boas práticas no pré-natal**,
conforme a metodologia oficial do SIAPS (Sistema de Informação em Saúde para a
Atenção Básica / Sistema de Informação da Atenção Primária à Saúde) do
Ministério da Saúde. A fórmula, os pesos das onze boas práticas e as faixas de
classificação implementados no programa reproduzem a norma vigente; nenhum
parâmetro foi arbitrado pelo autor. O detalhamento está em
`ARQUITETURA_TECNICA.md`.
