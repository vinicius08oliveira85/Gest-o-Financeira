-- Exclusão atômica de meta: remove os lançamentos vinculados e a própria meta
-- numa única transação. Se qualquer parte falhar, nada é removido.

create or replace function public.delete_goal_with_entries(p_goal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.entries where goal_id = p_goal_id::text;
  delete from public.goals where id = p_goal_id;
end;
$$;

grant execute on function public.delete_goal_with_entries(uuid) to anon;
grant execute on function public.delete_goal_with_entries(uuid) to authenticated;
