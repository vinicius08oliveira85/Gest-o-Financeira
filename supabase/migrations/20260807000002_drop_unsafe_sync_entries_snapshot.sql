-- Remove o RPC antigo de snapshot.
--
-- `sync_entries_snapshot(entries_json)` apagava do servidor todo lançamento que não
-- estivesse no array enviado. Como o RPC é exposto ao papel `anon`, qualquer cliente
-- com a chave pública podia chamá-lo com `[]` e apagar a tabela inteira. O app atual
-- não usa mais esse RPC (a sincronização é feita por `sync_entries_delta` com
-- `deleted_ids` explícito), então ele é removido para eliminar esse risco.

drop function if exists public.sync_entries_snapshot(jsonb);

notify pgrst, 'reload schema';
