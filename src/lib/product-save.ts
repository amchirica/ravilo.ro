export function productConstraintCode(message?: string | null) {
  const text = message ?? "";
  if (text.includes("products_sku_uidx") || text.includes("product_variants_sku_uidx")) return "sku";
  if (text.includes("products_slug_uidx")) return "slug";
  if (text.includes("duplicate key")) return "sku";
  return "save";
}

export function productSaveMessage(code: string | undefined) {
  if (code === "sku") return "Acest SKU există deja. Alege altul.";
  if (code === "slug") return "Acest slug există deja. Alege altul.";
  if (code === "validation") return "Completează numele, SKU-ul și prețul înainte de salvare.";
  if (code === "save") return "Nu am putut salva produsul. Încearcă din nou.";
  return null;
}
