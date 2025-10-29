export type RepoInfo = {
  id: number;
  full_name: string;            // "owner/repo"
  private: boolean;
  fork: boolean;                // Whether the repo is a fork
  default_branch: string;
  size: number;                 // KB
  visibility?: "public" | "private" | "internal";
  description?: string;
  topics?: string[];
  license?: { key: string; spdx_id?: string | null; name?: string } | null;
  pushed_at?: string;           // ISO
  updated_at?: string;          // ISO

  // URLs you'll use:
  url: string;                  // API base for this repo
  contents_url: string;         // ".../contents/{+path}"
  trees_url: string;            // ".../git/trees{/sha}"
  commits_url: string;          // ".../commits{/sha}"
  pulls_url: string;            // ".../pulls{/number}"
  compare_url: string;          // ".../compare/{base}...{head}"
  archive_url: string;          // ".../{archive_format}{/ref}"
};

