// Renders stackoverflow.svg from the Stack Exchange API so the profile README
// doesn't depend on a third-party image service.
import { writeFile } from "node:fs/promises";

const USER_ID = process.env.SO_USER_ID ?? "9698583";
const OUT = process.env.SO_CARD_OUT ?? "stackoverflow.svg";
const API = `https://api.stackexchange.com/2.3/users/${USER_ID}`;

async function api(path, params = {}) {
  const url = new URL(API + path);
  url.search = new URLSearchParams({ site: "stackoverflow", ...params });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const body = await res.json();
  if (body.error_id) throw new Error(`${url} -> ${body.error_name}: ${body.error_message}`);
  return body;
}

const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const compact = (n) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);

const [{ items: [user] }, answers, { items: tags }] = await Promise.all([
  api("", {}),
  api("/answers", { filter: "total" }),
  api("/top-tags", { pagesize: "3" }),
]);
if (!user) throw new Error(`No Stack Overflow user ${USER_ID}`);

const { gold, silver, bronze } = user.badge_counts;
// Lay badges out left to right, sizing each by its digit count (~12px per digit at 20px).
let x = 0;
const badges = [
  [gold, "#f1b600"],
  [silver, "#9a9b9e"],
  [bronze, "#ab825f"],
]
  .map(([count, color]) => {
    const g = `    <circle cx="${x + 5}" cy="19" r="5" fill="${color}"/><text class="value" x="${x + 14}" y="24">${count}</text>`;
    x += 14 + String(count).length * 12 + 14;
    return g;
  })
  .join("\n");
const tagList = tags.map((t) => t.tag_name).join(" · ");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="150" viewBox="0 0 420 150" role="img" aria-labelledby="title">
  <title id="title">${escape(user.display_name)}'s Stack Overflow stats: ${user.reputation} reputation, ${gold} gold, ${silver} silver, ${bronze} bronze badges, ${answers.total} answers</title>
  <style>
    :root { --bg: #ffffff; --border: #d0d7de; --fg: #1f2328; --muted: #59636e; --accent: #f48024; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #0d1117; --border: #30363d; --fg: #e6edf3; --muted: #9198a1; }
    }
    text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif; fill: var(--fg); }
    .card { fill: var(--bg); stroke: var(--border); }
    .name { font-size: 16px; font-weight: 600; }
    .label { font-size: 11px; fill: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
    .value { font-size: 20px; font-weight: 600; }
    .rep { fill: var(--accent); }
    .tags { font-size: 12px; fill: var(--muted); }
  </style>
  <rect class="card" x="0.5" y="0.5" width="419" height="149" rx="8"/>
  <g transform="translate(20 20)" fill="none" stroke-width="3.2">
    <path d="M4 26v12h28V26" stroke="#bcbbbb"/>
    <path d="M10 32h16M10.5 26.5l15.5 2M12 20l14.5 6M15 13.5l12.5 10M20.5 7l9 12.5M28 2.5l3 15.5" stroke="var(--accent)"/>
  </g>
  <text class="name" x="68" y="38">${escape(user.display_name)}</text>
  <text class="tags" x="68" y="57">Stack Overflow · ${escape(tagList)}</text>
  <g transform="translate(20 100)">
    <text class="label" y="0">Reputation</text>
    <text class="value rep" y="24">${compact(user.reputation)}</text>
  </g>
  <g transform="translate(130 100)">
    <text class="label" y="0">Answers</text>
    <text class="value" y="24">${answers.total}</text>
  </g>
  <g transform="translate(230 100)">
    <text class="label" y="0">Badges</text>
${badges}
  </g>
</svg>
`;

await writeFile(OUT, svg);
console.log(`Wrote ${OUT}: ${user.reputation} rep, ${answers.total} answers, ${gold}/${silver}/${bronze} badges`);
