import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Callout } from "@/components/mdx/Callout";
import { Diagram } from "@/components/mdx/Diagram";
import { GradientDemo } from "@/components/mdx/GradientDemo";
import { Step } from "@/components/mdx/Step";

/** Components every lesson can use without importing them. */
export const lessonComponents = { Callout, Diagram, GradientDemo, Step };

/** Compile lesson MDX (frontmatter already removed) into a React component. */
export async function compileLesson(source: string) {
  const { default: Content } = await evaluate(source, {
    Fragment: runtime.Fragment,
    jsx: runtime.jsx,
    jsxs: runtime.jsxs,
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins: [rehypeSlug, rehypeKatex],
  });
  return Content;
}
