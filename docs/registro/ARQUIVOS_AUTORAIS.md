# Seleção de código autoral

O comando `npm run registro:codigo` gera
`docs/registro/trechos-codigo-v1.txt` de forma determinística a partir dos
blobs do commit informado pelo Git (`HEAD` por padrão), independentemente do
diretório em que o script é chamado e das conversões locais de fim de linha.
O cabeçalho registra o SHA do commit, a quantidade de arquivos, UTF-8 e LF.

A seleção explícita cobre parser e validação SIAPS, limites de importação,
agregação C3 e A–K, filtros hierárquicos, autorização, Administração,
território histórico, observabilidade, headers, dashboard e a cadeia
executável de migrations. Estão incluídas as três migrations do hardening:

- `20260930010500_dashboard_practice_totals.sql`;
- `20260930013000_protect_last_active_admin.sql`;
- `20260930014500_reconcile_production_functions.sql`.

Por ser uma allow-list de código-fonte, o pacote não inclui `.env`, chaves,
`node_modules`, `.next`, relatórios temporários, dados reais, dumps de banco,
seed ou arquivos pessoais. O arquivo gerado é ignorado pelo Git e deve ser
revisado e armazenado como artefato controlado do registro, não incorporado
retroativamente ao commit congelado.

## Fluxo final

1. concluir CI, Preview, smoke, merge e validação do commit final de `main`;
2. declarar o freeze e confirmar árvore Git limpa;
3. executar `npm run registro:codigo` no commit congelado;
4. revisar o cabeçalho, a lista de origens e a ausência de segredo ou dado real;
5. criar a tag **anotada** `v1.0.0` exatamente no mesmo commit;
6. executar `npm run registro:hash -- --tag v1.0.0`;
7. verificar e guardar juntos o pacote, o manifesto e as evidências de aprovação.

O script de hash recusa árvore suja, tag inexistente ou leve, tag fora do
formato `vX.Y.Z`, divergência entre `HEAD`, tag e pacote, ou pacote ausente.
O manifesto registra o commit, o Git tree, um SHA-256 de todos os blobs
versionados (incluindo caminho, modo e bytes) e o SHA-256 do pacote autoral.
Os artefatos `trechos-codigo-v1.txt` e `hash-v*.txt` permanecem ignorados para
não criar autorreferência nem alterar o commit após o freeze.
