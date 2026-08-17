import katex from "katex";
import "katex/dist/katex.min.css";

/** Renders trusted curriculum formula strings; never pass unreviewed user text as LaTex. */
export function MathFormula({ latex, block = false }: { latex: string; block?: boolean }) {
  return <span className={block ? "block overflow-x-auto py-2" : "inline-block"} dangerouslySetInnerHTML={{ __html: katex.renderToString(latex, { displayMode: block, throwOnError: false, strict: "ignore" }) }} />;
}
