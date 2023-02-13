export default function createLink(data: Record<string, string | undefined>) {
  const url = new URL(window.location.href);

  for (const d of Object.keys(data)) {
    url.searchParams.delete(d);
    url.searchParams.append(d, data[d] ?? "");
  }
  return url.href;
}
