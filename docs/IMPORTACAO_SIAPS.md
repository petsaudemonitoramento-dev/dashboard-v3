# Importação SIAPS C3

Somente o perfil `gestao` pode importar; `admin` e `leitura` não acessam o fluxo nem a API. A planilha XLSX passa por limite de 10 MiB, validação de extensão/MIME disponível, leitura sem execução de fórmulas ou macros, detecção de cabeçalho, pré-visualização e confirmação. Cada importação aceita no máximo 10.000 linhas. CNES tem 7 dígitos, INE 10 e A–K são contagens inteiras não negativas que não podem superar o denominador.

O tamanho do XLSX compactado e o tamanho dos dados enviados são limites diferentes. Antes da publicação, o navegador serializa o mesmo JSON que será enviado e mede seus bytes em UTF-8. O teto seguro é 4 MiB, abaixo do limite de 4,5 MB das Vercel Functions. A API repete a medição sobre o corpo real, mesmo quando `Content-Length` não está presente. Se o conteúdo ultrapassar esse teto, a interface explica que a planilha precisa ser reduzida; ela não inicia uma requisição que a infraestrutura inevitavelmente recusaria.

O SHA-256 é calculado sobre o arquivo original. `siaps.imports.file_sha256` possui unicidade e a API também verifica duplicidade antes de publicar. A publicação usa `public.publish_siaps_c3_v1` em uma única transação, registra proveniência e atualiza os fatos correntes sem limitar equipes por lista fixa.

Erros impedem publicação. Se os pontos informados divergirem de `10×A + 9×(B–K)`, a pré-visualização avisa e usa a pontuação calculada; o Postgres valida a mesma regra novamente. A chave privilegiada existe somente no servidor.

Os cenários sintéticos de 1.000, 5.000 e 10.000 linhas fazem parte da suíte e podem ser executados isoladamente com `npm run test:volume`. O relatório registra tempo de parsing, tempo de validação, variação aproximada de heap, tamanho do XLSX e tamanho do JSON. Tempo e memória são métricas informativas, sem limiares rígidos que tornariam o CI instável; contagem, validação e limites de bytes são asserções funcionais.
