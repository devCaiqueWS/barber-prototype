"use client";

import { useEffect, useState } from "react";

export default function ApiDocsPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
        document.body.appendChild(s);
      });

    const init = async () => {
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.min.js");
        // Preset é opcional; ignore erro se não carregar
        try {
          await loadScript("https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.min.js");
        } catch {}
        // @ts-ignore - injetado via CDN
        const SwaggerUIBundle = (window as any).SwaggerUIBundle;
        if (!SwaggerUIBundle) throw new Error("SwaggerUIBundle indisponível");

        // @ts-ignore - pode não existir se o preset não carregar
        const SwaggerUIStandalonePreset = (window as any).SwaggerUIStandalonePreset;

        // @ts-ignore
        (window as any).ui = SwaggerUIBundle({
          url: "/openapi.json",
          dom_id: "#swagger-ui",
          presets: SwaggerUIStandalonePreset
            ? [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset]
            : [SwaggerUIBundle.presets.apis],
          layout: "BaseLayout",
        });
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Não foi possível inicializar a documentação");
      }
    };

    // Carregar CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css";
    document.head.appendChild(link);

    init();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">API Docs</h1>
        <p className="text-slate-300 mb-4">
          Documentação OpenAPI em <code className="text-amber-400">/openapi.json</code>
        </p>
        {error && (
          <div className="mb-4 text-red-400">{error}</div>
        )}
        <div id="swagger-ui" className="bg-white rounded-md" />
      </div>
    </div>
  );
}
