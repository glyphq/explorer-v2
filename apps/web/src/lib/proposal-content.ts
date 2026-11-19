export type ProposalDocument =
  | {
      content: string;
      format: "markdown" | "text";
      rawUrl: string;
      sourceUrl: string;
    }
  | {
      reason: string;
      sourceUrl?: string;
    };

type GitHubSource = {
  rawUrl: string;
  sourceUrl: string;
};

function githubSource(url: string): GitHubSource | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (parsed.hostname === "raw.githubusercontent.com") {
      if (parts.length < 4) {
        return null;
      }
      const [owner, repository, ref, ...path] = parts;
      return {
        rawUrl: parsed.toString(),
        sourceUrl: `https://github.com/${owner}/${repository}/blob/${ref}/${path.join("/")}`,
      };
    }

    if (parsed.hostname !== "github.com") {
      return null;
    }
    if (parts.length < 5 || (parts[2] !== "blob" && parts[2] !== "raw")) {
      return null;
    }
    const [owner, repository, , ref, ...path] = parts;
    return {
      rawUrl: `https://raw.githubusercontent.com/${owner}/${repository}/${ref}/${path.join("/")}`,
      sourceUrl: url,
    };
  } catch {
    return null;
  }
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value
    .replace(/&([a-z]+);/gi, (entity, name: string) => named[name.toLowerCase()] ?? entity)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function htmlToText(html: string): string {
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const fragment = article ?? main ?? body;

  return decodeEntities(
    fragment
      .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|main|li|tr|h[1-6])>/gi, "\n\n")
      .replace(/<h1\b[^>]*>/gi, "\n\n# ")
      .replace(/<h2\b[^>]*>/gi, "\n\n## ")
      .replace(/<h3\b[^>]*>/gi, "\n\n### ")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .trim(),
  );
}

function isMarkdown(url: string, contentType: string): boolean {
  return (
    /markdown|text\/x-markdown/i.test(contentType) || /\.(md|markdown|mdx)(?:$|[?#])/i.test(url)
  );
}

export async function getProposalDocument(url?: string): Promise<ProposalDocument> {
  if (!url) {
    return { reason: "This proposal does not reference an off-chain document." };
  }

  const source = githubSource(url);
  const documentUrl = source?.rawUrl ?? url;

  try {
    const response = await fetch(documentUrl, {
      headers: { Accept: "text/markdown, text/plain;q=0.9, text/html;q=0.8" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return {
        reason: `The source document returned ${response.status}.`,
        sourceUrl: url,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const textual =
      contentType === "" ||
      /^text\//i.test(contentType) ||
      /(json|xml|javascript)/i.test(contentType);
    if (!textual) {
      return {
        reason: `This proposal links to a ${contentType.split(";")[0] ?? "binary"} file.`,
        sourceUrl: url,
      };
    }
    const body = await response.text();
    if (isMarkdown(documentUrl, contentType) || source) {
      return {
        content: body,
        format: "markdown",
        rawUrl: source?.rawUrl ?? url,
        sourceUrl: url,
      };
    }

    if (/text\/html/i.test(contentType)) {
      const text = htmlToText(body);
      if (text.length < 120 || /PrivateBin/i.test(text)) {
        return {
          reason: "This document is rendered by an external application.",
          sourceUrl: url,
        };
      }
      return {
        content: text,
        format: "markdown",
        rawUrl: url,
        sourceUrl: url,
      };
    }

    return {
      content: body,
      format: "text",
      rawUrl: url,
      sourceUrl: url,
    };
  } catch {
    return {
      reason: "The source document could not be loaded.",
      sourceUrl: url,
    };
  }
}

export function resolveDocumentLink(
  href: string | undefined,
  sourceUrl: string,
  mode: "image" | "link",
): string | undefined {
  if (!href) {
    return undefined;
  }
  if (/^(https?:|mailto:|tel:|#)/i.test(href)) {
    return href;
  }

  const source = githubSource(sourceUrl);
  const base = mode === "image" ? (source?.rawUrl ?? sourceUrl) : sourceUrl;
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}
