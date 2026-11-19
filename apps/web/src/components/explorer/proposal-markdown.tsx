"use client";

import { CheckIcon } from "@solar-icons/react/linear/check";
import { CopyIcon } from "@solar-icons/react/linear/copy";
import "katex/dist/katex.min.css";
import { Children, isValidElement, type ReactNode, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { MermaidDiagram } from "@/components/explorer/proposal-mermaid";
import { resolveDocumentLink } from "@/lib/proposal-content";

const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "id"],
    a: [...(defaultSchema.attributes?.a ?? []), "ariaLabel", "rel", "target"],
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-/, "hljs"]],
    details: [...(defaultSchema.attributes?.details ?? []), "open"],
    input: [...(defaultSchema.attributes?.input ?? []), "checked", "disabled", "type"],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "details",
    "figcaption",
    "figure",
    "kbd",
    "mark",
    "summary",
  ],
};

function textContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(textContent).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textContent(node.props.children);
  }
  return "";
}

function languageOf(className: unknown): string | undefined {
  return typeof className === "string" ? /language-([\w-]+)/.exec(className)?.[1] : undefined;
}

function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const child = Children.toArray(children)[0];
  const language = isValidElement<{ className?: string }>(child)
    ? languageOf(child.props.className)
    : undefined;

  async function copy() {
    try {
      await navigator.clipboard.writeText(textContent(children));
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be unavailable in insecure or embedded contexts.
    }
  }

  return (
    <div className="proposal-code-block">
      <div className="proposal-code-bar">
        <span>{language ?? "Code"}</span>
        <button
          aria-label={copied ? "Copied" : "Copy code"}
          className="proposal-code-copy"
          onClick={copy}
          type="button"
        >
          {copied ? (
            <CheckIcon className="size-3.5 text-success" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

export function ProposalMarkdown({ content, sourceUrl }: { content: string; sourceUrl: string }) {
  const components: Components = {
    a: ({ children, href, node: _node, ...props }) => {
      const target = resolveDocumentLink(href, sourceUrl, "link");
      return (
        <a
          {...props}
          href={target}
          rel="noreferrer"
          target={target?.startsWith("#") ? undefined : "_blank"}
        >
          {children}
        </a>
      );
    },
    img: ({ alt, src }) => {
      const target =
        typeof src === "string" ? resolveDocumentLink(src, sourceUrl, "image") : undefined;
      return target ? <img alt={alt ?? ""} decoding="async" loading="lazy" src={target} /> : null;
    },
    pre: ({ children }) => {
      const child = Children.toArray(children)[0];
      if (isValidElement<{ className?: string; children?: ReactNode }>(child)) {
        const language = languageOf(child.props.className);
        if (language === "mermaid" || language === "mmd") {
          return <MermaidDiagram chart={textContent(child.props.children).replace(/\n$/, "")} />;
        }
      }
      return <CodeBlock>{children}</CodeBlock>;
    },
    table: ({ children }) => (
      <div className="proposal-table-wrap">
        <table>{children}</table>
      </div>
    ),
  };

  return (
    <div className="proposal-document">
      <ReactMarkdown
        components={components}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, sanitizeSchema],
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: "append",
              properties: {
                ariaLabel: "Link to this section",
                className: ["heading-anchor"],
              },
            },
          ],
          rehypeKatex,
          [rehypeHighlight, { detect: false, ignoreMissing: true }],
        ]}
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
