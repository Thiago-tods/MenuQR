-- RLS: leitura pública só do cardápio; escrita e pedidos apenas para admin.
-- Pedidos são criados no servidor com a service_role (ignora RLS). anon/authenticated
-- não têm política de INSERT em orders.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.complement_groups enable row level security;
alter table public.complement_options enable row level security;
alter table public.product_complement_groups enable row level security;
alter table public.tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_complements enable row level security;
alter table public.order_status_history enable row level security;

-- profiles
create policy profiles_self_read on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- leitura pública do cardápio
create policy settings_public_read on public.restaurant_settings for select using (true);
create policy categories_public_read on public.categories for select using (active);
create policy products_public_read on public.products for select using (not archived);
create policy groups_public_read on public.complement_groups for select using (true);
create policy options_public_read on public.complement_options for select using (true);
create policy pcg_public_read on public.product_complement_groups for select using (true);

-- escrita admin no catálogo
create policy settings_admin_write on public.restaurant_settings for all
  using (public.is_admin()) with check (public.is_admin());
create policy categories_admin_all on public.categories for all
  using (public.is_admin()) with check (public.is_admin());
create policy products_admin_all on public.products for all
  using (public.is_admin()) with check (public.is_admin());
create policy groups_admin_all on public.complement_groups for all
  using (public.is_admin()) with check (public.is_admin());
create policy options_admin_all on public.complement_options for all
  using (public.is_admin()) with check (public.is_admin());
create policy pcg_admin_all on public.product_complement_groups for all
  using (public.is_admin()) with check (public.is_admin());

-- admin também enxerga categorias inativas e produtos arquivados (políticas permissivas se somam)
-- via categories_admin_all / products_admin_all.

-- mesas: só admin (cliente valida o código no servidor)
create policy tables_admin_all on public.tables for all
  using (public.is_admin()) with check (public.is_admin());

-- pedidos: admin lê; admin só atualiza a coluna status
create policy orders_admin_read on public.orders for select using (public.is_admin());
create policy orders_admin_update on public.orders for update
  using (public.is_admin()) with check (public.is_admin());
create policy order_items_admin_read on public.order_items for select using (public.is_admin());
create policy oic_admin_read on public.order_item_complements for select using (public.is_admin());
create policy osh_admin_read on public.order_status_history for select using (public.is_admin());

revoke update on public.orders from authenticated;
grant update (status) on public.orders to authenticated;

-- Storage: imagens públicas para leitura, escrita só admin
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy menu_images_public_read on storage.objects for select
  using (bucket_id = 'menu-images');
create policy menu_images_admin_insert on storage.objects for insert
  with check (bucket_id = 'menu-images' and public.is_admin());
create policy menu_images_admin_update on storage.objects for update
  using (bucket_id = 'menu-images' and public.is_admin());
create policy menu_images_admin_delete on storage.objects for delete
  using (bucket_id = 'menu-images' and public.is_admin());
