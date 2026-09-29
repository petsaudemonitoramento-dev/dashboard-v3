# Importação SIAPS C3

Somente o perfil `gestao` pode importar; `admin` e `leitura` não acessam o fluxo nem a API. A planilha XLSX passa por limite de 10 MB, validação de extensão/MIME disponível, leitura sem execução de fórmulas ou macros, detecção de cabeçalho, pré-visualização e confirmação. CNES tem 7 dígitos, INE 10 e A–K são contagens inteiras não negativas que não podem superar o denominador.

O SHA-256 é calculado sobre o arquivo original. `siaps.imports.file_sha256` possui unicidade e a API também verifica duplicidade antes de publicar. A publicação usa `public.publish_siaps_c3_v1` em uma única transação, registra proveniência e atualiza os fatos correntes sem limitar equipes por lista fixa.

Erros impedem publicação. Se os pontos informados divergirem de `10×A + 9×(B–K)`, a pré-visualização avisa e usa a pontuação calculada; o Postgres valida a mesma regra novamente. A chave privilegiada existe somente no servidor.
