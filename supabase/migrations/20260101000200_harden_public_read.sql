-- Endurece a leitura pública. Achado dos testes de RLS (tests/rls):
-- produtos de categorias desativadas e ligações de produtos ocultos eram legíveis pela API.
-- A interface já os escondia; agora o banco também.

-- Produto só é público se não estiver arquivado E a categoria estiver ativa.
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select
  using (
    not archived
    and exists (
      select 1 from public.categories c
      where c.id = products.category_id and c.active
    )
  );

-- Ligação produto↔grupo só é pública quando o produto também é (a RLS de products se aplica na subconsulta).
drop policy if exists pcg_public_read on public.product_complement_groups;
create policy pcg_public_read on public.product_complement_groups for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_complement_groups.product_id
    )
  );
