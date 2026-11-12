import { saveProduct } from "../catalog-actions";

type Props = {
  categories: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  product?: {
    id: string;
    name: string;
    description: string;
    price: string;
    category_id: string;
    prep_minutes: number | null;
    available: boolean;
    featured: boolean;
    image_url: string | null;
    groupIds: string[];
  };
  error?: string;
};

export function ProductForm({ categories, groups, product, error }: Props) {
  return (
    <form
      action={saveProduct}
      className="max-w-2xl space-y-4"
      encType="multipart/form-data"
    >
      {product && <input type="hidden" name="id" value={product.id} />}
      {product?.image_url && (
        <input type="hidden" name="currentImage" value={product.image_url} />
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="name" className="label">
          Nome
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={80}
          defaultValue={product?.name}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="description" className="label">
          Descrição
        </label>
        <textarea
          id="description"
          name="description"
          maxLength={400}
          defaultValue={product?.description}
          className="input min-h-24 py-2"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="price" className="label">
            Preço (R$)
          </label>
          <input
            id="price"
            name="price"
            required
            inputMode="decimal"
            defaultValue={product?.price}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="categoryId" className="label">
            Categoria
          </label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={product?.category_id}
            className="input"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="prepMinutes" className="label">
            Preparo (min)
          </label>
          <input
            id="prepMinutes"
            name="prepMinutes"
            type="number"
            min={0}
            max={240}
            defaultValue={product?.prep_minutes ?? ""}
            className="input"
          />
        </div>
      </div>
      <div>
        <label htmlFor="image" className="label">
          Imagem (JPG, PNG ou WebP, até 3 MB)
        </label>
        <input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="input py-2"
        />
      </div>

      {groups.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="label">Grupos de complementos</legend>
          {groups.map((g) => (
            <label key={g.id} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="groupIds"
                value={g.id}
                defaultChecked={product?.groupIds.includes(g.id)}
                className="accent-terracotta size-4"
              />{" "}
              {g.name}
            </label>
          ))}
        </fieldset>
      )}

      <div className="flex gap-6">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="available"
            defaultChecked={product?.available ?? true}
            className="accent-terracotta size-4"
          />{" "}
          Disponível
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={product?.featured}
            className="accent-terracotta size-4"
          />{" "}
          Destaque
        </label>
      </div>
      <button className="btn-primary" type="submit">
        {product ? "Salvar alterações" : "Criar produto"}
      </button>
    </form>
  );
}
