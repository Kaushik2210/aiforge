import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { withBase } from "@/lib/base-path";
import { Callout } from "@/components/mdx/Callout";
import { Diagram } from "@/components/mdx/Diagram";
import { GradientDemo } from "@/components/mdx/GradientDemo";
import { Step } from "@/components/mdx/Step";

/** Components every lesson can use without importing them. */
/** The quest page owns the single h1, so a lesson's own "# Title" renders as an h2. */
/** Plain anchors do not get the base path from Next, so internal links are prefixed here. */
const LessonLink = ({ href, ...rest }: React.ComponentPropsWithoutRef<"a">) => <a href={href ? withBase(href) : href} {...rest} />;

const LessonTitle = (props: React.ComponentPropsWithoutRef<"h2">) => <h2 {...props} />;

/**
 * A code block that is wider than its column scrolls sideways. Keyboard users can only
 * scroll it if it can take focus (WCAG 2.1.1), so every code block is a tab stop.
 */
const LessonCode = (props: React.ComponentPropsWithoutRef<"pre">) => <pre tabIndex={0} {...props} />;

export const lessonComponents = { Callout, Diagram, GradientDemo, Step, h1: LessonTitle, a: LessonLink, pre: LessonCode };

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
