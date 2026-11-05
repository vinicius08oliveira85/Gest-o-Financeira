-- Remove a sobrecarga antiga de public.sync_entries_delta(uuid[], jsonb).
--
-- A migração 20260807000000 criou a versão segura com 3 argumentos e valor padrão
-- em `deleted_ids`, mas a função de 2 argumentos continuou existindo. No PostgreSQL,
-- uma chamada com 2 argumentos resolve para a sobrecarga exata, não para a versão
-- com default — ou seja, clientes antigos (inclusive PWA em cache) ainda executavam
-- o "delete cego" e podiam apagar lançamentos criados em outro dispositivo.
--
-- Com a sobrecarga removida, chamadas antigas de 2 argumentos passam a usar a versão
-- segura, cujo `deleted_ids` default é vazio.

drop function if exists public.sync_entries_delta(uuid[], jsonb);

-- Atualiza o cache de schema do PostgREST para refletir a remoção imediatamente.
notify pgrst, 'reload schema';
