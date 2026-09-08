# Camada de banco server-side

Diretório reservado para conexões PostgreSQL diretas em ingestões e workers.
A Fase 1 usa o cliente Supabase associado à sessão para preservar RLS.
Uma futura conexão postgres deve receber DATABASE_URL somente no servidor;
nunca deve reutilizar chave pública como senha nem expor credenciais ao browser.
