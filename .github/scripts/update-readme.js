const fs = require("node:fs");

async function main() {
  const owner = "santana-org";
  const readmePath = "profile/README.md";
  const maxRepos = 5;
  const token = process.env.GITHUB_TOKEN;

  if (!owner) {
    throw new Error("Missing ORG_NAME");
  }

  if (!token) {
    throw new Error("Missing GITHUB_TOKEN");
  }

  const response = await fetch(
    `https://api.github.com/orgs/${owner}/repos?per_page=100&type=public`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "update-org-readme-script",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const repos = await response.json();

  const topRepos = repos
    .filter((repo) => {
      return !repo.fork && !repo.archived && !repo.disabled && repo.name !== ".github";
    })
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, maxRepos);

  const generated = topRepos
    .map((repo) => {
      const desc = (repo.description || "No description")
        .replace(/\r?\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      return `- [${repo.name}](${repo.html_url}) - ${desc}`;
    })
    .join("\n");

  const start = "<!-- top-projects:start -->";
  const end = "<!-- top-projects:end -->";

  const readme = fs.readFileSync(readmePath, "utf8");

  if (!readme.includes(start) || !readme.includes(end)) {
    throw new Error(`Markers not found in ${readmePath}`);
  }

  const updated = readme.replace(
    new RegExp(`${start}[\\s\\S]*?${end}`),
    `${start}\n${generated}\n${end}`
  );

  fs.writeFileSync(readmePath, updated);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
