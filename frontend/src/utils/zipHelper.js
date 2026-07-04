import JSZip from "jszip";
import { saveAs } from "file-saver";

export async function downloadAsZip(htmlContent, filename = "page") {
  const zip = new JSZip();
  zip.file("index.html", htmlContent);
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  saveAs(blob, `${filename}.zip`);
}

// Bundles the Landing Page module's full 5-page site into one zip, with
// fixed filenames so the pages' internal <a href="privacy.html"> etc. links
// actually resolve once extracted. `pages` is { index, privacy, terms,
// disclaimer, contact } — any key with no HTML yet is simply skipped.
export async function downloadSiteAsZip(pages = {}, filename = "site") {
  const zip = new JSZip();
  const fileMap = {
    index: "index.html", privacy: "privacy.html", terms: "terms.html",
    disclaimer: "disclaimer.html", contact: "contact.html"
  };
  Object.entries(fileMap).forEach(([key, name]) => {
    if (pages[key]) zip.file(name, pages[key]);
  });
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  saveAs(blob, `${filename}.zip`);
}
