const fs = require("fs");
const path = require("path");

const domain = "https://scandura.com.pl";

// 🔹 DOPASUJ listę do faktycznych stron w projekcie
const pages = [
  "/",                // index.html
  "/about.html",
  "/services.html",
  "/projects.html",
  "/calculator.html", // jeśli kalkulator jest osobną stroną; jeśli modal na home — usuń ten wiersz
  "/booking.html",
  "/contact.html",
  "/privacy.html"
];

const today = new Date().toISOString().split("T")[0];

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.map((page) => {
    const changefreq = page === "/" || page.includes("booking") || page.includes("calculator")
      ? "weekly"
      : "monthly";
    const priority = page === "/" ? "1.0"
      : page.includes("privacy") ? "0.3"
      : page.includes("contact") ? "0.6"
      : "0.8";

    return `  <url>
    <loc>${domain}${page}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join("\n") +
  `\n</urlset>\n`;

// zapis do katalogu głównego repo (root)
fs.writeFileSync(path.join(__dirname, "../sitemap.xml"), xml, "utf8");
console.log("✅ Wygenerowano sitemap.xml!");
