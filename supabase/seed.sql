-- Seed de demonstração: Casa Oliva (fictício). Idempotente para rodar em ambiente limpo.
-- Imagens: image_url fica nulo até as fotos licenciadas serem cadastradas pelo admin
-- (veja docs/DEPLOYMENT.md). A interface exibe um placeholder neutro.

insert into public.restaurant_settings
  (id, name, description, address, phone, opening_hours, estimated_minutes, accepting_orders, closed_message)
values (
  1, 'Casa Oliva',
  'Bistrô contemporâneo de cozinha autoral, ingredientes frescos e ambiente acolhedor.',
  'Rua das Oliveiras, 120 · Centro · São Paulo/SP', '(11) 4000-1234',
  '{"mon":{"open":"11:00","close":"23:00"},"tue":{"open":"11:00","close":"23:00"},"wed":{"open":"11:00","close":"23:00"},"thu":{"open":"11:00","close":"23:00"},"fri":{"open":"11:00","close":"00:00"},"sat":{"open":"11:00","close":"00:00"},"sun":{"open":"11:00","close":"17:00"}}',
  30, true, 'Estamos fechados no momento. Volte no nosso horário de funcionamento.'
) on conflict (id) do nothing;

insert into public.categories (name, slug, sort_order) values
  ('Entradas', 'entradas', 1),
  ('Pratos principais', 'pratos', 2),
  ('Burgers', 'burgers', 3),
  ('Sobremesas', 'sobremesas', 4),
  ('Bebidas', 'bebidas', 5)
on conflict (slug) do nothing;

insert into public.products (category_id, name, description, price, featured, prep_minutes, sort_order)
select c.id, p.name, p.description, p.price, p.featured, p.prep, p.ord
from (values
  ('entradas', 'Bruschetta de tomate', 'Pão rústico, tomates maduros, manjericão e azeite extravirgem.', 28.00, false, 10, 1),
  ('entradas', 'Burrata com pesto', 'Burrata fresca, pesto de manjericão e torradas.', 46.00, true, 10, 2),
  ('entradas', 'Croquete de costela', 'Seis unidades com maionese defumada.', 38.00, true, 15, 3),
  ('entradas', 'Carpaccio de carne', 'Lâminas finas, alcaparras, parmesão e rúcula.', 49.00, false, 10, 4),
  ('pratos', 'Risoto de cogumelos', 'Arroz arbóreo, mix de cogumelos e parmesão.', 68.00, true, 25, 1),
  ('pratos', 'Salmão grelhado', 'Salmão com purê de batata-doce e legumes.', 84.00, true, 25, 2),
  ('pratos', 'Fettuccine ao funghi', 'Massa fresca com molho cremoso de cogumelos.', 62.00, false, 20, 3),
  ('pratos', 'Filé ao molho madeira', 'Filé mignon, molho madeira e batatas rústicas.', 92.00, true, 30, 4),
  ('pratos', 'Frango assado com ervas', 'Coxa e sobrecoxa, arroz de ervas e farofa.', 54.00, false, 25, 5),
  ('burgers', 'Burger Oliva', 'Blend 180 g, queijo prato, cebola caramelizada e maionese da casa.', 39.00, true, 20, 1),
  ('burgers', 'Burger Bacon', 'Blend 180 g, bacon crocante, cheddar e molho barbecue.', 44.00, true, 20, 2),
  ('burgers', 'Burger Veggie', 'Hambúrguer de grão-de-bico, rúcula e tomate.', 36.00, false, 20, 3),
  ('sobremesas', 'Petit gâteau', 'Bolo quente de chocolate com sorvete de creme.', 32.00, true, 15, 1),
  ('sobremesas', 'Pudim de leite', 'Receita da casa com calda de caramelo.', 18.00, false, 5, 2),
  ('sobremesas', 'Tiramisù', 'Mascarpone, café e cacau.', 26.00, false, 5, 3),
  ('sobremesas', 'Cheesecake de frutas vermelhas', 'Base crocante e calda artesanal.', 28.00, false, 5, 4),
  ('bebidas', 'Limonada suíça', 'Limão, leite condensado e gelo.', 14.00, false, 5, 1),
  ('bebidas', 'Suco de laranja', 'Laranja espremida na hora, 400 ml.', 12.00, false, 5, 2),
  ('bebidas', 'Água com gás', 'Garrafa 500 ml.', 7.00, false, 2, 3),
  ('bebidas', 'Café espresso', 'Grãos selecionados, dose simples.', 8.00, false, 3, 4)
) as p(cat, name, description, price, featured, prep, ord)
join public.categories c on c.slug = p.cat
where not exists (select 1 from public.products x where x.name = p.name);

insert into public.complement_groups (id, name, min_select, max_select) values
  ('00000000-0000-4000-8000-000000000001', 'Ponto da carne', 1, 1),
  ('00000000-0000-4000-8000-000000000002', 'Adicionais', 0, 3),
  ('00000000-0000-4000-8000-000000000003', 'Molhos', 0, 2),
  ('00000000-0000-4000-8000-000000000004', 'Acompanhamento', 1, 1)
on conflict (id) do nothing;

insert into public.complement_options (group_id, name, price_delta, sort_order)
select g.id, o.name, o.price, o.ord
from (values
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Mal passado', 0.00, 1),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Ao ponto', 0.00, 2),
  ('00000000-0000-4000-8000-000000000001'::uuid, 'Bem passado', 0.00, 3),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'Bacon', 6.00, 1),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'Ovo', 3.50, 2),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'Queijo extra', 5.00, 3),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'Cebola caramelizada', 4.00, 4),
  ('00000000-0000-4000-8000-000000000003'::uuid, 'Maionese da casa', 0.00, 1),
  ('00000000-0000-4000-8000-000000000003'::uuid, 'Barbecue', 0.00, 2),
  ('00000000-0000-4000-8000-000000000003'::uuid, 'Mostarda e mel', 0.00, 3),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'Batata rústica', 0.00, 1),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'Arroz de ervas', 0.00, 2),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'Salada verde', 0.00, 3)
) as o(gid, name, price, ord)
join public.complement_groups g on g.id = o.gid
where not exists (
  select 1 from public.complement_options x where x.group_id = g.id and x.name = o.name
);

-- Burgers: ponto, adicionais, molhos. Filé: ponto e acompanhamento. Frango e salmão: acompanhamento.
insert into public.product_complement_groups (product_id, group_id, sort_order)
select p.id, m.gid, m.ord
from (values
  ('Burger Oliva', '00000000-0000-4000-8000-000000000001'::uuid, 1),
  ('Burger Oliva', '00000000-0000-4000-8000-000000000002'::uuid, 2),
  ('Burger Oliva', '00000000-0000-4000-8000-000000000003'::uuid, 3),
  ('Burger Bacon', '00000000-0000-4000-8000-000000000001'::uuid, 1),
  ('Burger Bacon', '00000000-0000-4000-8000-000000000002'::uuid, 2),
  ('Burger Bacon', '00000000-0000-4000-8000-000000000003'::uuid, 3),
  ('Burger Veggie', '00000000-0000-4000-8000-000000000002'::uuid, 1),
  ('Burger Veggie', '00000000-0000-4000-8000-000000000003'::uuid, 2),
  ('Filé ao molho madeira', '00000000-0000-4000-8000-000000000001'::uuid, 1),
  ('Filé ao molho madeira', '00000000-0000-4000-8000-000000000004'::uuid, 2),
  ('Salmão grelhado', '00000000-0000-4000-8000-000000000004'::uuid, 1),
  ('Frango assado com ervas', '00000000-0000-4000-8000-000000000004'::uuid, 1)
) as m(pname, gid, ord)
join public.products p on p.name = m.pname
on conflict do nothing;

insert into public.tables (name) values
  ('Mesa 1'), ('Mesa 2'), ('Mesa 3'), ('Mesa 4'), ('Mesa 5'), ('Mesa 6')
on conflict (name) do nothing;
