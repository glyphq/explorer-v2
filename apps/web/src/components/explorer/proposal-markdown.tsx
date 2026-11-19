"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { resolveDocumentLink } from "@/lib/proposal-content";

export function ProposalMarkdown({ content, sourceUrl }: { content: string; sourceUrl: string }) {
  const components: Components = {
    a: ({ children, href }) => {
      const target = resolveDocumentLink(href, sourceUrl, "link");
      return (
        <a href={target} rel="noreferrer" target={target?.startsWith("#") ? undefined : "_blank"}>
          {children}
        </a>
      );
    },
    img: ({ alt, src }) => {
      const target =
        typeof src === "string" ? resolveDocumentLink(src, sourceUrl, "image") : undefined;
      return target ? <img alt={alt ?? ""} loading="lazy" src={target} /> : null;
    },
  };

  return (
    <div className="proposal-document">
      <ReactMarkdown
        components={components}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
