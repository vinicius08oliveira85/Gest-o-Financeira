-- `goals.created_at`: a tabela foi criada sem esta coluna, mas o cliente ordena
-- por ela em `fetchGoals` (`order('created_at')`). Sem a coluna, o PostgREST
-- respondia 400 e nenhuma meta era lida nem sincronizada com a nuvem.
--
-- O `default now()` preenche as linhas já existentes; `not null` evita que uma
-- meta nova fique sem posição na ordenação.

alter table public.goals
  add column if not exists created_at timestamptz not null default now();

-- Atualiza o cache de schema do PostgREST para a coluna aparecer imediatamente.
notify pgrst, 'reload schema';
