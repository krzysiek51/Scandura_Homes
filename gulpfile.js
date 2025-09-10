const { src, dest, series, parallel, watch } = require("gulp");
const nunjucksRender = require("gulp-nunjucks-render");
const data = require("gulp-data");
const plumber = require("gulp-plumber");
const { deleteAsync } = require("del");
const path = require("path");
const fs = require("fs");

function loadSiteData() {
  const file = path.join(__dirname, "src", "data", "site.json");
  const base = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
  return {
    ...base,
    currentYear: new Date().getFullYear(), // <- dodajemy rok tutaj
  };
}

function clean() {
  return deleteAsync(["dist"]);
}

function html() {
  return src("src/pages/**/*.njk")
    .pipe(plumber())
    .pipe(data(() => ({ site: loadSiteData() }))) // site.currentYear dostępny w szablonach
    .pipe(
      nunjucksRender({
        path: ["src"], // layouts, partials, pages
        envOptions: { trimBlocks: true, lstripBlocks: true },
      })
    )
    .pipe(dest("dist"));
}

function assets() {
  return src(
    ["css/**/*", "js/**/*", "photos/**/*", "favicon.*", "!**/*.map"],
    { base: "." }
  ).pipe(dest("dist"));
}

function dev() {
  watch("src/**/*.njk", html);
  watch("src/data/**/*.json", html);
  watch(["css/**/*", "js/**/*", "photos/**/*"], assets);
}

exports.clean = clean;
exports.build = series(clean, parallel(html, assets));
exports.dev = series(exports.build, dev);
