# Seleção de código autoral

O comando `npm run registro:codigo` gera `docs/registro/trechos-codigo-v1.txt` de forma determinística, sem capa ornamental, identificando caminho e linhas em comentários técnicos. A seleção cobre parser/importação SIAPS, agregação C3, A–K, autorização, território histórico, camada analítica e dashboard.

Ficam excluídos `node_modules`, lockfile, artefatos de build, bibliotecas, arquivos gerados e assets externos. Revise a saída antes do envio ao NITT.

O hash definitivo só deve ser produzido após congelar e criar a tag V1.0. O comando `npm run registro:hash -- --tag v1.0.0` recusa árvore Git suja ou tag divergente e grava o manifesto em `docs/registro/hash-v1.0.0.txt`. O SHA-256 é calculado sobre o conteúdo dos arquivos versionados na tag (lido do Git, exceto `package-lock.json`), portanto arquivos locais ignorados, como `.env.local`, e conversões de fim de linha não alteram o resultado; o manifesto registra também o hash da árvore Git (`tree`).
