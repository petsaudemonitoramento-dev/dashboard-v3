# Importação SIAPS C3

Perfis `admin` e `gestao` podem importar; `leitura` não acessa o fluxo nem a API. A planilha XLSX passa por leitura, detecção de cabeçalho, validação, pré-visualização, resumo, confirmação e publicação. CNES tem 7 dígitos, INE 10, A–K são contagens e pontos/denominador/razão oficial são preservados.

O SHA-256 é calculado sobre o arquivo original. `siaps.imports.file_sha256` possui unicidade e a API também verifica duplicidade antes de publicar. A publicação reutiliza `public.stage_siaps_c3_compact`, registra proveniência e atualiza os fatos correntes sem limitar equipes à coorte piloto.

Erros impedem publicação; advertências informam divergências como pontos oficiais diferentes do cálculo A–K, sem substituir silenciosamente o valor oficial. A chave privilegiada existe somente no servidor.
