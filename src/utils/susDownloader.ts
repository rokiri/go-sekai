const DIFFICULTY_MAP: Record<string, { label: string; level: number }> = {
  easy:   { label: "EASY",   level: 1 },
  normal: { label: "NORMAL", level: 2 },
  hard:   { label: "HARD",   level: 3 },
  expert: { label: "EXPERT", level: 4 },
  master: { label: "MASTER", level: 5 },
  append: { label: "APPEND", level: 6 },
};

export async function downloadChartAsSus(
  musicId: string,
  difficulty: string,
  musicTitle: string,
  playLevel: number
) {
  const paddedId = musicId.padStart(4, "0");
  const STORAGE_BASE = import.meta.env.VITE_ASSET_DOMAIN_MINIO;
  const url = `${STORAGE_BASE}/sekai-assets/music/music_score/${paddedId}_01/${difficulty}`;  
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Chart not found: ${url}`);
  const raw = await res.text();

  const diff = DIFFICULTY_MAP[difficulty] ?? {
    label: difficulty.toUpperCase(),
    level: 0,
  };

  // Patch header SUS agar compatible dengan SUS players
  const header = [
    `#TITLE "${musicTitle}"`,
    `#ARTIST ""`,
    `#DESIGNER ""`,
    `#DIFFICULTY ${diff.level}`,
    `#PLAYLEVEL ${playLevel}`,
    `#SONGID "${paddedId}"`,
    `#WAVE ""`,
    `#WAVEOFFSET 0`,
    `#JACKET ""`,
    ``,
  ].join("\n");

  const patched = header + raw;

  const blob = new Blob([patched], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${musicTitle}_${diff.label}.sus`;
  a.click();
  URL.revokeObjectURL(a.href);
}