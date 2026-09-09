# Manifesto do pacote de registro

Documento **gerado** por `scripts/gerar-pacote-registro.py`. Não editar à
mão: o valor deste manifesto está em ser derivado do conteúdo empacotado,
e não em concordar com ele.

A cópia versionada deste arquivo descreve o commit **anterior** àquele que
a introduziu — é inevitável, já que commitá-la muda o commit. O commit que
ela descreve está declarado abaixo, e é sempre esse o que corresponde ao
pacote e ao resumo. Para obter o manifesto do commit atual, basta gerar o
pacote de novo.

## Programa

| Campo | Conteúdo |
|---|---|
| Nome | Cuidado na Gestação na APS |
| Versão | 3.0 |
| Desenvolvido por | Lucca Araújo |
| Programa institucional | PET-Saúde |
| Instituição | Universidade Federal de Campina Grande — UFCG |
| Localidade | Campina Grande — Paraíba, Brasil |

## Identificação desta geração

| Campo | Conteúdo |
|---|---|
| Commit | `3e1f2b1247ca9788c84a8f346263fee488ae900f` |
| Ramo | `claude/v3-usable-rc` |
| Data do commit | 2026-09-09T01:45:41+00:00 |
| Data da geração | 2026-09-09T01:45:42Z |
| Arquivo | `cuidado-gestacao-aps-v3.0-3e1f2b1247ca.zip` |
| Tamanho | 231966 bytes |
| **SHA-256 do pacote** | `66be86551e524f23077ed34c2a2fcb57f93e977861180ef9733e2e9d832a32ac` |
| Arquivos incluídos | 100 |

O **pacote** é reprodutível: gerar novamente a partir do mesmo commit
produz bytes idênticos e, portanto, o mesmo SHA-256. Toda entrada do ZIP
tem data fixa e ordem estável, e o conteúdo é lido do commit, não do
diretório de trabalho.

Este **manifesto** não é byte a byte idêntico entre gerações, porque
registra o instante em que foi gerado. O que ele prova é o pacote, e o
resumo do pacote não muda.

Conferência:

```
sha256sum cuidado-gestacao-aps-v3.0-3e1f2b1247ca.zip
66be86551e524f23077ed34c2a2fcb57f93e977861180ef9733e2e9d832a32ac  cuidado-gestacao-aps-v3.0-3e1f2b1247ca.zip
```

## Versões principais

| Pacote | Versão |
|---|---|
| `next` | 16.3.4 |
| `react` | 19.2.8 |
| `react-dom` | 19.2.8 |
| `typescript` | 5.9.3 |
| `zod` | 4.5.4 |
| `@supabase/ssr` | 0.12.7 |
| `@supabase/supabase-js` | 2.116.0 |
| `tailwindcss` | 4.3.3 |
| `vitest` | 5.0.0 |
| `eslint` | 9.39.5 |
| `xlsx` | https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz |

## Exclusões aplicadas

Segredos, dado real e artefatos de construção não acompanham o pacote. A
lista de arquivos vem de `git ls-files`, então nada não versionado entra;
os padrões abaixo são uma segunda barreira, aplicada por cima disso.

```
(^|/)\.env($|\.)
(^|/)\.env[^/]*$
(^|/)node_modules(/|$)
(^|/)\.next(/|$)
(^|/)\.vitest(/|$)
(^|/)coverage(/|$)
(^|/)\.supabase-test(/|$)
(^|/)supabase/\.(branches|temp)(/|$)
\.tsbuildinfo$
(^|/)\.DS_Store$
\.log$
(^|/)(secrets?|credenciais?)(/|$)
\.(pem|key|p12|pfx|keystore)$
(^|/)id_(rsa|ed25519)
\.(xlsx|xls|xlsm|csv)$
(^|/)(dados|data)-reais?(/|$)
```

Arquivos versionados que casaram com algum padrão e ficaram de fora:

- `.env.example` — `(^|/)\.env($|\.)`

Além disso, todo arquivo incluído é lido e verificado contra marcadores de
segredo: chave privada, chave secreta e token de acesso do Supabase, token
do GitHub, chave de API e *client secret* do Google, e JWT. Um achado
interrompe a geração em vez de produzir um pacote comprometido. A palavra
`service_role` é verificada à parte, apenas no código da aplicação, que
jamais deve tocar essa chave; em documentação e em teste ela aparece
legitimamente, por estar sendo proibida ou explicada.

## Arquivos e resumos

100 arquivos, em ordem estável. O resumo é do conteúdo do
arquivo no commit indicado.

| # | Arquivo | SHA-256 |
|---|---|---|
| 1 | `.gitignore` | `053db01a5b059e747bf3f748af5aae9d820bc895543a97bb47f2b87823963680` |
| 2 | `README.md` | `4854ab7e3fbf711da290a95c77ac72d68799da15efc8726c679c4795873d648c` |
| 3 | `docs/IMPLEMENTATION_CONTRACT.md` | `e161f4b5f840a3fd62e7e2d62d6b32cb4972fa4f55e75e1afac463a0a72788d6` |
| 4 | `docs/SECURITY_DEBT.md` | `78c0a59609b59deff170c1839dd91d5a1f3be123696788f699ce15f702cf80a2` |
| 5 | `docs/VERIFICACAO_V3.md` | `08801129b51504e9d0d898b4bfc606901afe03b0269444bcb83044a15da661c6` |
| 6 | `docs/registro/ARQUITETURA_TECNICA.md` | `47112bedc6010ee937c29d9af1aba837b5c6d16a3dc7786fbe8f60d6e69cb9fe` |
| 7 | `docs/registro/CHANGELOG_V3.md` | `ee62b1626ee98ebc594d8ebb02e9ec3a753a1cc6ce3ade41e331e6bd309f75cf` |
| 8 | `docs/registro/DESCRICAO_FUNCIONAL.md` | `b7f018c11c0c7a4f9ad14f2263e9e52f640ce04d01fba399b88fbd5cf9460759` |
| 9 | `docs/registro/ESTRUTURA_CODIGO.md` | `3d46536cabcb7805ad4e156b3c970234412b7fbe0d509fb7a8032f759b7a3181` |
| 10 | `docs/registro/IDENTIFICACAO_VERSAO.md` | `d06f5c1d7c06ce4e2f47a39b25cdff8a80f1d7262f99f1ea27db52214996a059` |
| 11 | `docs/registro/LEIA-ME.md` | `983821739052a30c424e9f7d707b8af12643e7fe0f442eadc3d95c424d04bd1d` |
| 12 | `docs/registro/PRIVACIDADE_E_SEGURANCA.md` | `9fc511ee813848028f7c37fd9ccafb68d234806beb22c4abbe12e673087f1bbd` |
| 13 | `docs/registro/TECNOLOGIAS.md` | `f3e3bc0d914b7bde25b7cee54bd589517114542537edad5f64653767af516769` |
| 14 | `eslint.config.mjs` | `99e7aa061eef5ddfa0dfe186fc622b5fc40e3df088934080d230d2b97095c856` |
| 15 | `next-env.d.ts` | `1862ac4bbbc5192d4bf562161df66ea547ed3e67173100656ab606ae9797db2b` |
| 16 | `next.config.ts` | `13c14eaf596f16b598a3d8f6c7b061d2f1aeedf14b5afa6624844c83354b9b4c` |
| 17 | `package-lock.json` | `7d11303ce6a1828853a89212b5d9ee4104b19cae17d2e0bae07a7cf6de4d7d71` |
| 18 | `package.json` | `3f7c1418c34a593ee14f3eff8e10053fd0b6cab0d6c87572fe39c2b3b31aa670` |
| 19 | `postcss.config.mjs` | `dfac7ac2d86d326a0e5adb024e7943c181393ed17a5fcb8f0315b24c7da6ddde` |
| 20 | `proxy.ts` | `4f37fd364701f2d47bba580fcacea535542e4dfc0605b0d6c1181f1cca970c3a` |
| 21 | `scripts/gerar-pacote-registro.py` | `81279cdff5b6663b5c2febc64f83b5447d2be091a74e859d4aa258b123bd26ee` |
| 22 | `scripts/gerar-pacote-registro.sh` | `209cc83a3674cf1540fdeed9205117609099b99f9210fcfd3daf8b47ff936752` |
| 23 | `src/app/(auth)/actions.ts` | `4cc708e696602f73b7587f4a62bb4ebbca2f250a5c7c9a583880ba992b8025f3` |
| 24 | `src/app/(auth)/aguardando-aprovacao/page.tsx` | `89d6d473f046824d872d64047dfb5aa7686117336eeaf445c9c4c3793e853869` |
| 25 | `src/app/(auth)/cadastro/page.tsx` | `4e488a32b20532233957be54d53757e26deaec39878445947586a4443cc3538e` |
| 26 | `src/app/(auth)/completar-cadastro/page.tsx` | `00b847e48deadc56806fc6bc9dbf64629b2dd4b2cef713800adc25c24a6bad6a` |
| 27 | `src/app/(auth)/entrar/page.tsx` | `887a14ee750823060f0921f0a0cd47f9483647dcc4a51c68524d2c6e307855fa` |
| 28 | `src/app/(auth)/recuperar-senha/page.tsx` | `81d70e5a1080ee1bf75d58fd5db126612fcb80472eea035b864089436d3fa44a` |
| 29 | `src/app/(auth)/redefinir-senha/page.tsx` | `6edcb05c97c3d0a407c7c2271e33a260eae4afdb6ee12a04469a3166a2786446` |
| 30 | `src/app/(sistema)/sistema/administracao/actions.ts` | `75ed63180ff3100e422634aa834c8cac7a7b5bf0e20c35ecc9d044f4c2127aab` |
| 31 | `src/app/(sistema)/sistema/administracao/page.tsx` | `9eb256acb8edc9f840aefc6cd2a29b180fc94d7845d25f850a51194363ac4f71` |
| 32 | `src/app/(sistema)/sistema/administracao/user-card.tsx` | `a342ed8b688d94fd44011ac961bc198a9e1c9b40258d12519869cb35de014be2` |
| 33 | `src/app/(sistema)/sistema/gestao/actions.ts` | `d316b9238b7e9a1d19a2967e114c5c9e4713f5acefbb9c8be67586a4be6c9cfd` |
| 34 | `src/app/(sistema)/sistema/gestao/importar/import-form.tsx` | `46ad3ff2f1b67d09e84d005d627ba85561c3babc78d81696dc3718e8630dd899` |
| 35 | `src/app/(sistema)/sistema/gestao/importar/page.tsx` | `23630df481219368f9bf7d66ae7b248247cce1919a1263370b63e3615d0e9f97` |
| 36 | `src/app/(sistema)/sistema/gestao/page.tsx` | `b263fb3bef895765397ceb2dee236ccb4c70cfeece5798388b09f3081a383e90` |
| 37 | `src/app/(sistema)/sistema/layout.tsx` | `327dcf6f3ce09abe9eaf35b574976a8c97623b8896cf05c72252e9e60e65cbe0` |
| 38 | `src/app/(sistema)/sistema/page.tsx` | `7779ca9856f65bcb736c39f58cde2630876fb524c45314361e203bcd5f4d4200` |
| 39 | `src/app/(sistema)/sistema/profissional/actions.ts` | `3964c353c992446d666867ce59f7ab6dd60c863e8d9cb49cc4dafc12dfcaa92b` |
| 40 | `src/app/(sistema)/sistema/profissional/gestantes/[publicId]/clinical-forms.tsx` | `8c556bcc5363f0af459f9025454582d871955a3bc2d9ba48b6c056861832a36d` |
| 41 | `src/app/(sistema)/sistema/profissional/gestantes/[publicId]/page.tsx` | `464a65f60ab0767194fb7375090dd05bab0adcdb7381a443cd12c2093adc264b` |
| 42 | `src/app/(sistema)/sistema/profissional/gestantes/new-patient-form.tsx` | `d9e745ce500cbba3b0f1a8b6effe2862b36a42c9804c1116bfa81ed5afda6867` |
| 43 | `src/app/(sistema)/sistema/profissional/gestantes/page.tsx` | `78d753bb9f628e0916b6dca28a3f7eb8c3aa8e8a44114c489e896c330fdc581d` |
| 44 | `src/app/(sistema)/sistema/profissional/importar/import-form.tsx` | `d337753fac88a929847b16592f637d1bc84c5f743154354d4bbeb525add9124a` |
| 45 | `src/app/(sistema)/sistema/profissional/importar/page.tsx` | `be54fc730b299a74fce0b641218e891f8935e6f9daf86c8c1c5bd3e8352af766` |
| 46 | `src/app/(sistema)/sistema/profissional/page.tsx` | `05ab272f44e22d63aa1826a709069d46276a0b4499f45e603961a70b1000722f` |
| 47 | `src/app/acesso-negado/page.tsx` | `45032e6cfe97598ee8ce6786b9e92a2ea9c72748a0308f12739e16e8084f7e8f` |
| 48 | `src/app/auth/callback/route.ts` | `a8f09538049250ba63e738698a91065b49599bf89c28976ab2b728b447fc2c1a` |
| 49 | `src/app/erro/page.tsx` | `15ae18774f496e295ae452633215c4dd2b0693a1ddf349f6a24b4c1cf3c19701` |
| 50 | `src/app/globals.css` | `0789990081d46f9d10be2ac07a006491dc35d00ad36535dfc122c8222ce407f4` |
| 51 | `src/app/layout.tsx` | `50b4f4366c335dfc910fbc7ed861a520985345a0c80d1d9fd3156c863d6d75b9` |
| 52 | `src/app/page.tsx` | `2e620ad395450cc0bdd4a5a5f9f9413f9f622383d29f0c106d4c816160dbd6a2` |
| 53 | `src/components/auth/auth-forms.tsx` | `1ef464189bc51dc1d7ec5fcbaf82d651e608ed51a91f0053d2f828b604257025` |
| 54 | `src/components/auth/auth-shell.tsx` | `ecb93223eb89f5a8d9b81de889780adf1d661ff52e5a917080e47553766915a3` |
| 55 | `src/config/env.ts` | `4b80760756df5c5242f6cb2c8e9ef2d051a0a309a7679cde295ef50a7662d7e2` |
| 56 | `src/lib/admin/status.ts` | `404e41b94c8caf15006e5bba2ab6a861aa4bfcffbdb86a1418e3f771f8dade39` |
| 57 | `src/lib/auth/guards.ts` | `765dd28e021e107d4b687f7a8d905380f164bd65f26c87eedb2af04ce66bea5a` |
| 58 | `src/lib/auth/navigation.ts` | `fbbf7e909c0247a79cc89f5bc652b9d82d01bc1cc09f395b7c8371cf387ec1a6` |
| 59 | `src/lib/auth/route-guard.ts` | `b58d731bb1176553cabee3e61a2842ccb137c84ac3efa2c5b5fc42732ee136e9` |
| 60 | `src/lib/auth/safe-redirect.ts` | `6a39b0200953d081da6fd88db684f39a6eb0712be276f63f4313284b341dfb0e` |
| 61 | `src/lib/auth/supabase-errors.ts` | `87c9e37708b941d063998e613f629d6dc412a9ba93566d10368365f286e5d99f` |
| 62 | `src/lib/auth/types.ts` | `58dd3b63a87d937c10f3ae40d4c8d70c6a61d8852918fca3719f58399a0961b7` |
| 63 | `src/lib/db/README.md` | `57c73934ef36764aa49ad3b725270c908066fcc95605b6a0ef9c17645c64fad9` |
| 64 | `src/lib/gestao/queries.ts` | `9227ee8a23a6a27dae39bc94247f2327d5ff4d1695788df774e204439fb41560` |
| 65 | `src/lib/professional/pec/columns.ts` | `276831c012646e04a587631ff854cc8eb2379993bae5a428b1faaed7d0f03df7` |
| 66 | `src/lib/professional/pec/csv.ts` | `f2d2f1cf88c96d6b60237b296138331930d6a3c01224bab75f7064157c5a49d8` |
| 67 | `src/lib/professional/pec/parse.ts` | `3f9f8e57b4b9baf3a92ad4116ce624bec5cad4783476fa966b972f78f59cd020` |
| 68 | `src/lib/professional/pec/workbook.ts` | `17b3bb5c15db6a399ed06682adf4398e1ad61239b04daab0c01bbedc8b4ee356` |
| 69 | `src/lib/professional/queries.ts` | `7a5de543e5b90c0f745d4049e091089fe6694bd49a2e0d21325d42f2f9e1891b` |
| 70 | `src/lib/siaps/parse.ts` | `e1474b63080c03eb0a1cfba0cf90231ed6915d7917cb29717e15aca2b7e2157e` |
| 71 | `src/lib/siaps/workbook.ts` | `c28352ed68c086135cf656be1b24bc363ac1b9398377db6682a280c3882cc89b` |
| 72 | `src/lib/supabase/client.ts` | `f3002113f014e26d3ee88f791cc751a27bcdb148fb889542924d53ff7d4697c9` |
| 73 | `src/lib/supabase/proxy.ts` | `cd49a43c20b4553c3a60eae02eb2dedfd388fd435d1ecb1f0666fcb7d91f5a18` |
| 74 | `src/lib/supabase/server.ts` | `8768e692c286473d6180a5c8650ad24d3f5ba13047b9b6d3770d2aca76d742ba` |
| 75 | `src/lib/validation/admin.ts` | `8ca724ad91bbdc738a71ff8cc16841f692f0b29dc38d67f47e08a679edce1538` |
| 76 | `src/lib/validation/auth.ts` | `e0672fbfc929442ddb5bde38ae8601320b83fdb6e46541bd7926f6ff287e7a86` |
| 77 | `src/lib/validation/professional.ts` | `3ec0dd6c277913f368798e6b19fee77fa7e5e9b034747efc70896f3ce064e997` |
| 78 | `supabase/.gitignore` | `507699eb91144818edf61d3a079212cacf31d8db520eae428e3b48fcf0d6919c` |
| 79 | `supabase/config.toml` | `9541e45700b9be114e28758c348accfeea01b34c2e149912e2e3ac931f21b6a3` |
| 80 | `supabase/migrations/20260908230613_foundation_schemas_profiles.sql` | `1ccddb0c8d7220bfe0af1bdacdc36442ae1a00375a54581fb80668ea28c6db86` |
| 81 | `supabase/migrations/20260908230633_authorization_audit_rls.sql` | `2f4d83bd7f2a909a8e9deff28a0542d48f8d76f6ac15091179bdbac496ee0993` |
| 82 | `supabase/migrations/20260908230654_private_storage_buckets.sql` | `77c2fa7187090a89e926c0acc298ca09f3bdf4d9a0e62af837ce67bea35fc287` |
| 83 | `supabase/migrations/20260908230901_advisor_hardening.sql` | `d8c31ee2d20bf001c93985635351fe0d8e5ceef1b06ee413735027f2cbd2ff77` |
| 84 | `supabase/migrations/20260909004056_fix_profile_lifecycle_guards.sql` | `5f5f35b9ec5d8b2d699c84b0026f4c7d8c615914d1927fb8810f5161d92a530c` |
| 85 | `supabase/migrations/20260909010000_admin_profile_actions.sql` | `485ed65fbf48b39c8b208e107db6a4ac7e9e4fa34f9ff28b0350bac51383dc88` |
| 86 | `supabase/migrations/20260909020000_professional_module.sql` | `26a7f73bf8925edea0ac0e631c1ae076abd0800d9d56915f7633cd20762aa626` |
| 87 | `supabase/migrations/20260909030000_core_territory_and_siaps.sql` | `0ea9c0c8a01538c5ae415451e83a95f6e85bd77aa71517a919cf2dc2c92925d8` |
| 88 | `supabase/tests/001_foundation_rls.test.sql` | `5b7eeb67a33c58f465bd12e523d8a11097348b905e6b8cc472db8cc62ca39399` |
| 89 | `supabase/tests/002_admin_actions.test.sql` | `7f04b19117f1ce1abc189c102738f6b7e1c0e544c15f3f1bc2ec793d208e553b` |
| 90 | `supabase/tests/003_professional_isolation.test.sql` | `dca3a466a6e4d01b014d0531c5b049234bad50cc00b0688a4ee7c2e5bd6c207c` |
| 91 | `supabase/tests/004_siaps_c3_engine.test.sql` | `8dc077ef9f682cfca5f835dbfa66a516a838fb3ff8036b0b9f69a02da7ea95ef` |
| 92 | `tests/admin/status.test.ts` | `23e474b3974202f7cd2ddd80b4ce787c0588f2529e5638515bd63bebed2bc253` |
| 93 | `tests/auth/access-fallback.test.ts` | `f89ddb5bc483790ade3ffb2534eb2cafecedb93cc639482d2c2fc38abf0bd18a` |
| 94 | `tests/auth/guards.test.ts` | `8e52bbbbd1b762001ab928832a0f2bcd0d6f69a2498ea1c3c01d3bdbf63a3e47` |
| 95 | `tests/auth/safe-redirect.test.ts` | `2b3eba9b32ce662923950ba9a6b94f0a18f2e17d89ccbad07c244cf430e01da2` |
| 96 | `tests/config/env.test.ts` | `db57ca09d8dbb43682ac687f201f84702b54c0b8bca663ac75061cc3dcbad1ea` |
| 97 | `tests/professional/pec-parser.test.ts` | `eb2f2dd6263ca292868e0644b1ecf0837d3ef93d3c58ff6bdd72759dea788640` |
| 98 | `tests/siaps/parser.test.ts` | `1339a6db0aba473d4c3aae8c6d4515b3314db280d1b656e8db5833b2793be329` |
| 99 | `tsconfig.json` | `1a5e65a0610d22208caf2c42d0f38c973cf7b0b11501a2ab3b63067679d954fd` |
| 100 | `vitest.config.ts` | `7851e12c61b3673894fb5933306dfffc84af0d74e86c07d1e572936b0bf8e07f` |

## Resumo deste manifesto

Resumo SHA-256 do conteúdo acima, calculado antes desta seção ser
acrescentada — de modo que o manifesto possa declarar o próprio resumo
sem circularidade:

```
f6fc2caba8a19ed1755b8f93abc2ecab6b81b6ada1500523d40c3dab895e2845
```
