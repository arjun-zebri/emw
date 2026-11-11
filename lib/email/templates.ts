/*
 * The emails, as HTML and plain text. Pure functions of their data with no imports, so they render
 * the same on the server and in scripts/preview-emails.mts.
 *
 * Built for inboxes, not browsers: tables, inline styles, 600px wide, images with explicit widths,
 * system serif and sans fallbacks (Boska where it's installed). The brand is the website's:
 * paper and ink, hairlines, square corners, photography first, one black button at most.
 */

export type Rendered = { subject: string; html: string; text: string };

export type Photo = { src: string; width?: number | null; height?: number | null };
export type Card = { name: string; line: string; photo?: Photo };

export type ApplicationData = {
  origin: string;
  business: string;
  person: string;
  email: string;
  phone?: string;
  discipline: string;
  services: string[];
  /** Native script first, e.g. "Tiếng Việt (Vietnamese)". */
  languages: string[];
  based?: string;
  travels: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  story: string[];
  /** The team-only review notes, one line each. */
  notes: string[];
  /** @1200 copies, cover first. */
  photos: Photo[];
  photoCount: number;
};

export type VendorData = { origin: string; first: string; card: Card; url?: string };

// ── Tokens ──────────────────────────────────────────────────────────────

const PAPER = "#faf8f5";
const INK = "#161412";
const SOFT = "#75706a";
const MUTE = "#8a857f";
const LINE = "#e3e0dc"; // ink at 12% on paper, solid so every client draws it
const SERIF = "Boska, 'Times New Roman', Times, Georgia, serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const attr = esc;

// ── Pieces ──────────────────────────────────────────────────────────────

function shell(o: { origin: string; preheader: string; body: string; title: string }) {
  return `<!doctype html>
<html lang="en-AU" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${esc(o.title)}</title>
<style>
  @font-face { font-family: Boska; src: url("${attr(o.origin)}/email/boska.woff2") format("woff2"); font-weight: 200 900; font-style: normal; }
  body { margin: 0; padding: 0; background: ${PAPER}; }
  a { color: ${INK}; }
  img { border: 0; line-height: 100%; outline: none; text-decoration: none; display: block; }
  @media (max-width: 620px) {
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .h1 { font-size: 34px !important; line-height: 38px !important; }
    .stack { display: block !important; width: 100% !important; }
    .thumb { width: 100% !important; padding: 0 0 8px 0 !important; }
    .label { width: 104px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(o.preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};">
<tr><td align="center" style="padding:0 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td align="center" style="padding:44px 0 36px;">
  <a href="${attr(o.origin)}" style="text-decoration:none;"><img src="${attr(o.origin)}/email/monogram.png" width="96" height="34" alt="East Meets Wed" style="width:96px;height:auto;"></a>
</td></tr>
${o.body}
<tr><td class="px" style="padding:56px 48px 48px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${LINE};padding-top:24px;font-family:${SANS};font-size:12px;line-height:19px;color:${MUTE};">
    East Meets Wed. Wedding vendors for couples bringing two cultures together.<br>
    <a href="${attr(o.origin)}" style="color:${MUTE};text-decoration:underline;">eastmeetswed.com</a>
  </td></tr></table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const row = (inner: string, pad = "0 48px") => `<tr><td class="px" style="padding:${pad};">${inner}</td></tr>`;

const h1 = (text: string) =>
  `<h1 class="h1" style="margin:0;font-family:${SERIF};font-weight:400;font-size:42px;line-height:44px;letter-spacing:-0.8px;color:${INK};">${esc(text)}</h1>`;

const p = (html: string, top = 18) =>
  `<p style="margin:${top}px 0 0;font-family:${SANS};font-size:15px;line-height:25px;color:${SOFT};">${html}</p>`;

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;"><tr>
  <td style="background:${INK};">
    <a href="${attr(href)}" style="display:inline-block;padding:17px 30px;font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;color:${PAPER};text-decoration:none;">${esc(label)}</a>
  </td></tr></table>`;
}

/** Their listing as couples see it in the directory: the cover, the name, one line. */
function card(c: Card, href?: string) {
  const img = c.photo
    ? `<img src="${attr(c.photo.src)}" width="408" alt="${attr(c.name)}" style="width:100%;max-width:408px;height:auto;background:#e8e5e0;">`
    : `<div style="height:280px;background:#e8e5e0;"></div>`;
  const wrap = (s: string) => (href ? `<a href="${attr(href)}" style="text-decoration:none;color:${INK};">${s}</a>` : s);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td>${wrap(img)}</td></tr>
  <tr><td style="padding-top:18px;font-family:${SERIF};font-size:24px;line-height:28px;letter-spacing:-0.3px;color:${INK};">${wrap(esc(c.name))}</td></tr>
  <tr><td style="padding-top:6px;font-family:${SANS};font-size:13px;line-height:19px;color:${MUTE};">${esc(c.line)}</td></tr>
</table>`;
}

/** Ruled rows: a short title in the serif, a line beneath it. For what happens next. */
function steps(items: { title: string; body: string; done?: boolean }[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${LINE};">
${items
  .map(
    (s) => `<tr><td style="border-bottom:1px solid ${LINE};padding:20px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="28" valign="top" style="width:28px;padding-top:5px;font-family:${SANS};font-size:13px;line-height:13px;color:${s.done ? INK : MUTE};">${s.done ? "&#10003;" : "&#9675;"}</td>
    <td valign="top">
      <div style="font-family:${SERIF};font-size:19px;line-height:24px;color:${INK};">${esc(s.title)}</div>
      <div style="padding-top:4px;font-family:${SANS};font-size:14px;line-height:22px;color:${SOFT};">${esc(s.body)}</div>
    </td>
  </tr></table>
</td></tr>`,
  )
  .join("\n")}
</table>`;
}

function details(rows: [string, string | undefined][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${LINE};">
${rows
  .filter(([, v]) => v && v.trim())
  .map(
    ([label, value]) => `<tr>
  <td class="label" width="136" valign="top" style="width:136px;border-bottom:1px solid ${LINE};padding:13px 12px 13px 0;font-family:${SANS};font-size:13px;line-height:21px;color:${MUTE};">${esc(label)}</td>
  <td valign="top" style="border-bottom:1px solid ${LINE};padding:13px 0;font-family:${SANS};font-size:14px;line-height:21px;color:${INK};">${value}</td>
</tr>`,
  )
  .join("\n")}
</table>`;
}

const link = (href: string, label = href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")) =>
  `<a href="${attr(href)}" style="color:${INK};text-decoration:underline;text-decoration-color:${LINE};">${esc(label)}</a>`;

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, "")}…` : s);

// Bold, underline and italic can nest three deep, hence the three passes below.
const MARKS = /\*\*(.+?)\*\*|\+\+(.+?)\+\+|(?<![\p{L}\p{N}])_(.+?)_(?![\p{L}\p{N}])/gu;
const unmark = (_: string, a?: string, b?: string, c?: string) => a ?? b ?? c ?? "";

/** Story blocks to plain paragraphs: list and text marks (see lib/story.ts) dropped, for a short excerpt. */
const plain = (blocks: string[]) =>
  blocks
    .map((b) =>
      b
        .split("\n")
        .map((l) =>
          l
            .replace(/^(#{1,3}\s|[-•*]\s|\d+\.\s)/, "")
            .replace(MARKS, unmark)
            .replace(MARKS, unmark)
            .replace(MARKS, unmark)
            .replace(/\\([*+_])/g, "$1"),
        )
        .join(" "),
    )
    .filter(Boolean);

// ── Photos ──────────────────────────────────────────────────────────────

const ratio = (p: Photo) => (p.width && p.height ? p.width / p.height : 0.8);

/** Landscape covers run the full width; portrait ones are held narrower so they don't fill the screen. */
function coverImage(p: Photo, name: string) {
  const w = ratio(p) >= 1 ? 504 : 336;
  const h = Math.round(w / ratio(p));
  return `<img src="${attr(p.src)}" width="${w}" height="${h}" alt="${attr(name)}, cover photo" style="width:${w}px;max-width:100%;height:auto;background:#e8e5e0;">`;
}

/** A portrait cover with the next photos stacked in a column beside it, so the width is used. */
function beside(cover: Photo, rest: Photo[], name: string) {
  // Percentages, so the pair stays side by side on a phone as well (two thirds and one third).
  const stack = rest
    .map(
      (p, i) =>
        `<img src="${attr(p.src)}" width="160" height="${Math.round(160 / ratio(p))}" alt="" style="width:100%;height:auto;background:#e8e5e0;${i ? "margin-top:8px;" : ""}">`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:504px;"><tr>
  <td width="67%" valign="top" style="width:67%;padding-right:8px;"><img src="${attr(cover.src)}" width="336" height="${Math.round(336 / ratio(cover))}" alt="${attr(name)}, cover photo" style="width:100%;height:auto;background:#e8e5e0;"></td>
  <td width="33%" valign="top" style="width:33%;">${stack}</td>
</tr></table>`;
}

/** A row of photos at one shared height, each at its own ratio, so nothing is cropped (as on the vendor page). */
function justified(photos: Photo[], width: number, gap: number) {
  const sum = photos.reduce((t, p) => t + ratio(p), 0);
  const height = Math.round((width - gap * (photos.length - 1)) / sum);
  const cells = photos.map((p, i) => {
    const w = Math.round(ratio(p) * height);
    return `<td class="stack thumb" width="${w}" valign="top" style="width:${w}px;padding:0 ${i < photos.length - 1 ? gap : 0}px 0 0;"><img src="${attr(p.src)}" width="${w}" height="${height}" alt="" style="width:${w}px;max-width:100%;height:auto;background:#e8e5e0;"></td>`;
  });
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:${gap}px;"><tr>${cells.join("")}</tr></table>`;
}

// ── The admin email ─────────────────────────────────────────────────────

export function applicationAdmin(d: ApplicationData): Rendered {
  const subject = `New application: ${d.business}`;
  const approvals = `${d.origin}/admin/approvals`;
  const excerpt = clip(plain(d.story).join(" "), 420);
  const [cover, ...rest] = d.photos;
  const thumbs = rest.slice(0, 3);
  const more = d.photoCount - 1 - thumbs.length;

  const photos = cover
    ? row(
        `${ratio(cover) < 1 && thumbs.length ? beside(cover, thumbs, d.business) : `${coverImage(cover, d.business)}${thumbs.length ? justified(thumbs, 504, 8) : ""}`}${
          more > 0 ? `<p style="margin:10px 0 0;font-family:${SANS};font-size:12px;line-height:18px;color:${MUTE};">And ${more} more in Approvals.</p>` : ""
        }`,
        "36px 48px 0",
      )
    : row(p("No photos arrived with this application.", 0), "28px 48px 0");

  const body = [
    row(h1(`${d.business} would like to join`)),
    row(p(`${esc(d.person)} applied from the website. The listing is saved as a draft and stays private until you approve it.`)),
    photos,
    row(
      details([
        ["Applicant", esc(d.person)],
        ["Email", link(`mailto:${d.email}`, d.email)],
        ["Phone", d.phone ? link(`tel:${d.phone.replace(/[^\d+]/g, "")}`, d.phone) : undefined],
        ["What they do", esc(d.discipline)],
        ["Services", esc(d.services.join(", "))],
        ["Languages", esc(d.languages.join(", "))],
        ["Based in", d.based ? esc(d.based) : undefined],
        ["Travels to", esc(d.travels)],
        ["Website", d.website ? link(d.website) : undefined],
        ["Instagram", d.instagram ? link(d.instagram, "Instagram") : undefined],
        ["Facebook", d.facebook ? link(d.facebook, "Facebook") : undefined],
      ]),
      "36px 48px 0",
    ),
    excerpt
      ? row(
          `<div style="font-family:${SERIF};font-size:21px;line-height:26px;color:${INK};">In their words</div>${p(esc(excerpt), 10)}`,
          "36px 48px 0",
        )
      : "",
    d.notes.length
      ? row(
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f0eb;"><tr><td style="padding:18px 20px;font-family:${SANS};font-size:13px;line-height:21px;color:${SOFT};">${d.notes
            .map(esc)
            .join("<br>")}</td></tr></table>`,
          "28px 48px 0",
        )
      : "",
    row(button(approvals, "Review in Approvals"), "4px 48px 0"),
  ].join("\n");

  const text = [
    `${d.business} would like to join`,
    "",
    `${d.person} applied from the website. The listing is saved as a draft and stays private until you approve it.`,
    "",
    `Applicant: ${d.person}`,
    `Email: ${d.email}`,
    d.phone && `Phone: ${d.phone}`,
    `What they do: ${d.discipline}`,
    `Services: ${d.services.join(", ")}`,
    `Languages: ${d.languages.join(", ")}`,
    d.based && `Based in: ${d.based}`,
    `Travels to: ${d.travels}`,
    d.website && `Website: ${d.website}`,
    d.instagram && `Instagram: ${d.instagram}`,
    d.facebook && `Facebook: ${d.facebook}`,
    `Photos: ${d.photoCount}`,
    "",
    excerpt && `In their words: ${excerpt}`,
    d.notes.length ? `\n${d.notes.join("\n")}` : "",
    "",
    `Review in Approvals: ${approvals}`,
  ]
    .filter((l): l is string => typeof l === "string")
    .join("\n");

  return { subject, html: shell({ origin: d.origin, title: subject, preheader: `${d.person} applied to list ${d.business}. Review it in Approvals.`, body }), text };
}

// ── To the vendor: received ─────────────────────────────────────────────

export function applicationReceived(d: VendorData): Rendered {
  const subject = `We have your application for ${d.card.name}`;
  const hello = d.first ? `Thank you, ${d.first}` : "Thank you";
  const intro = `Your application for ${esc(d.card.name)} is with us, and we’re glad you sent it. We read every one ourselves, so couples only ever find people we’d recommend to a friend.`;
  const nextSteps = [
    { title: "Application received", body: "Your photos, your story and how couples reach you.", done: true },
    { title: "We read it", body: "One of us reads it properly. If anything needs a second look, we’ll write to you." },
    { title: "You go live", body: "We’ll email you the moment couples can find you, beside vendors who, like you, know their way around a wedding with two families and two sets of traditions." },
  ];
  const changes = "Need to change something in the meantime? Reply to this email and we’ll take care of it.";
  const body = [
    row(h1(hello)),
    row(p(intro)),
    row(card(d.card), "40px 96px 0"),
    row(`<div style="font-family:${SERIF};font-size:21px;line-height:26px;color:${INK};padding-bottom:14px;">What happens next</div>${steps(nextSteps)}`, "48px 48px 0"),
    row(p(changes, 28)),
    row(p(`Warmly,<br><span style="color:${INK};">The East Meets Wed team</span>`, 22)),
  ].join("\n");

  const text = [
    hello,
    "",
    `Your application for ${d.card.name} is with us, and we’re glad you sent it. We read every one ourselves, so couples only ever find people we’d recommend to a friend.`,
    "",
    "What happens next",
    ...nextSteps.map((s) => `- ${s.title}. ${s.body}`),
    "",
    changes,
    "",
    "Warmly,",
    "The East Meets Wed team",
  ].join("\n");

  return { subject, html: shell({ origin: d.origin, title: subject, preheader: "We read every application ourselves. Here’s what happens next.", body }), text };
}

// ── To the vendor: approved ─────────────────────────────────────────────

export function listingLive(d: VendorData & { url: string }): Rendered {
  const subject = `${d.card.name} is live on East Meets Wed`;
  const heading = `Welcome to East Meets Wed${d.first ? `, ${d.first}` : ""}`;
  const intro = `${esc(d.card.name)} is live. From today, couples planning a wedding across two cultures can find you by what you do, where you work and the languages you speak. You’re in good company: every vendor here was approved by hand, and each of them knows what it takes to bring two families together on one day.`;
  const notes = [
    { title: "Your cover photo does the work", body: "It’s what couples see first, in the directory and on your page. If you’d rather lead with a different one, reply and we’ll swap it." },
    { title: "Couples reach you from your page", body: "When one writes, answer as you would any couple. A quick, personal reply is the thing they remember." },
    { title: "Keep your page true to you", body: "New work, a new language, a new city you travel to. Reply with the change and we’ll update it." },
  ];
  const applyUrl = `${d.origin}/list-your-business`;
  const invite = "Know a vendor who belongs here? The directory is better for every good one in it.";
  const body = [
    row(h1(heading)),
    row(p(intro)),
    row(card(d.card, d.url), "40px 96px 0"),
    row(button(d.url, "See your listing"), "8px 96px 0"),
    row(`<div style="font-family:${SERIF};font-size:21px;line-height:26px;color:${INK};padding-bottom:14px;">A few things worth knowing</div>${steps(notes)}`, "48px 48px 0"),
    row(p(`${invite} Send them to ${link(applyUrl)}.`, 28)),
    row(p(`Warmly,<br><span style="color:${INK};">The East Meets Wed team</span>`, 22)),
  ].join("\n");

  const text = [
    heading,
    "",
    `${d.card.name} is live. From today, couples planning a wedding across two cultures can find you by what you do, where you work and the languages you speak. You’re in good company: every vendor here was approved by hand, and each of them knows what it takes to bring two families together on one day.`,
    "",
    `See your listing: ${d.url}`,
    "",
    "A few things worth knowing",
    ...notes.map((n) => `- ${n.title} ${n.body}`),
    "",
    `${invite} Send them to ${applyUrl}`,
    "",
    "Warmly,",
    "The East Meets Wed team",
  ].join("\n");

  return { subject, html: shell({ origin: d.origin, title: subject, preheader: "Couples can find you from today.", body }), text };
}

// ── To the applicant: confirm your email ────────────────────────────────

/** Sent when someone makes an account to apply. The link proves the address is theirs. */
export function confirmEmail(d: { origin: string; url: string }): Rendered {
  const subject = "Confirm your email for East Meets Wed";
  const intro = "Good to have you here. East Meets Wed is a directory of wedding vendors who work with couples bringing two cultures together, and we’d love to see what you do. Confirm this is your address and your application is open.";
  const after = "The link works for 24 hours. If this wasn’t you, ignore this email and nothing more will happen.";
  const body = [
    row(h1("Confirm your email")),
    row(p(intro)),
    row(button(d.url, "Confirm my email"), "8px 48px 0"),
    row(p(after, 28)),
    row(p(`Warmly,<br><span style="color:${INK};">The East Meets Wed team</span>`, 22)),
  ].join("\n");

  const text = ["Confirm your email", "", intro, "", `Confirm my email: ${d.url}`, "", after, "", "Warmly,", "The East Meets Wed team"].join("\n");

  return { subject, html: shell({ origin: d.origin, title: subject, preheader: "One click and your application is open.", body }), text };
}

/** A link to choose a password: for someone who's forgotten theirs, or a vendor signing in for the first time. */
export function passwordEmail(d: { origin: string; url: string }): Rendered {
  const subject = "Choose your East Meets Wed password";
  const intro = "Here’s your link to choose a password for East Meets Wed. Open it on the device you want to sign in on, choose a password, and you’ll go straight to your listing.";
  const after = "The link works once, for an hour. If you didn’t ask for it, ignore this email and your account stays as it is.";
  const body = [
    row(h1("Choose your password")),
    row(p(intro)),
    row(button(d.url, "Choose a password"), "8px 48px 0"),
    row(p(after, 28)),
    row(p(`Warmly,<br><span style="color:${INK};">The East Meets Wed team</span>`, 22)),
  ].join("\n");

  const text = ["Choose your password", "", intro, "", `Choose a password: ${d.url}`, "", after, "", "Warmly,", "The East Meets Wed team"].join("\n");

  return { subject, html: shell({ origin: d.origin, title: subject, preheader: "Your link to sign in to East Meets Wed.", body }), text };
}
