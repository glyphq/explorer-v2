"use client";

import { useEffect, useId, useState } from "react";

export function MermaidDiagram({ chart }: { chart: string }) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [svg, setSvg] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const diagramId = `proposal-mermaid-${reactId}`;

    async function render() {
      setFailed(false);
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          securityLevel: "strict",
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            fontFamily: "inherit",
          },
        });
        const result = await mermaid.render(diagramId, chart);
        if (!cancelled) {
          setSvg(result.svg);
        }
      } catch {
        if (!cancelled) {
          setSvg(undefined);
          setFailed(true);
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  if (failed) {
    return (
      <div className="proposal-mermaid-error" role="note">
        <p>This diagram could not be rendered.</p>
        <pre>
          <code>{chart}</code>
        </pre>
      </div>
    );
  }

  if (!svg) {
    return <div className="proposal-mermaid-loading">Rendering diagram…</div>;
  }

  return (
    <div
      className="proposal-mermaid"
      // Mermaid returns a complete SVG document fragment. The library runs with
      // `securityLevel: "strict"`, which escapes labels and disables scripts.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
