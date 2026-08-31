export function AdminImageField({
  label = "Imagine",
  current,
  fileName = "image",
  keepName = "imageKeep",
  removeName = "imageRemove",
  hint = "JPEG, PNG, WebP sau AVIF. Max 8 MB. Încarcă fișierul, nu un URL.",
}: {
  label?: string;
  current?: string | null;
  fileName?: string;
  keepName?: string;
  removeName?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[0.8125rem] text-mute">{label}</p>
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt="" className="h-36 w-full max-w-xs object-cover" />
      ) : (
        <div className="flex h-36 max-w-xs items-center bg-surface px-4 text-sm text-mute">Nicio imagine</div>
      )}
      <input type="hidden" name={keepName} value={current ?? ""} />
      <input
        type="file"
        name={fileName}
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="block w-full text-sm file:mr-3 file:h-11 file:border file:border-line file:bg-paper file:px-4 file:text-sm"
      />
      {current ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name={removeName} />
          Șterge imaginea
        </label>
      ) : null}
      <p className="text-xs text-mute">{hint}</p>
    </div>
  );
}
