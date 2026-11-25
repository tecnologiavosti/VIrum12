import {getDocumentProxy, resolvePDFJSImports} from "npm:unpdf@0.12.1";
import * as pdfjs from "npm:unpdf@0.12.1/pdfjs";

export async function readPdfText(bytes: Uint8Array) {
  await resolvePDFJSImports(() => Promise.resolve(pdfjs));
  const pdf = await getDocumentProxy(bytes, {isEvalSupported:false, disableFontFace:true,maxImageSize:0});
  try {
    if (pdf.numPages > 250) return "";
    const pages:string[]=[];
    for (let n=1;n<=Math.min(pdf.numPages,4);n++) {
      const page=await pdf.getPage(n);
      const extracted=await page.getTextContent();
      pages.push(extracted.items.map((item:any)=>typeof item.str==="string"?item.str:"").join(" "));
      page.cleanup();
    }
    return pages.join("\n").replace(/\s+/g," ").trim();
  } finally {await pdf.destroy();}
}
