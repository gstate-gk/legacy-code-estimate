import type { MetadataRoute } from "next";

const SITE_URL = "https://legacy-code-estimate.vercel.app";

// バンドル C で導入するユースケース別ランディング (/lang/[id]) もここに登録する
const LANGUAGE_IDS = [
  "cobol", "pli", "fortran", "mumps", "rpg", "vb6",
  "ada", "java", "c", "cpp", "pascal", "basic", "assembler",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const langPages: MetadataRoute.Sitemap = LANGUAGE_IDS.map((id) => ({
    url: `${SITE_URL}/lang/${id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...langPages,
  ];
}
