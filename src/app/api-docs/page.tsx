"use client";

import { useEffect, useState } from "react";

type SwaggerUIBundleType = {
  (options: {
    url: string;
    dom_id: string;
    presets?: unknown[];
    layout?: string;
  }): unknown;
  presets: {
    apis: unknown;
  };
};

declare global {
  interface Window {
    SwaggerUIBundle?: SwaggerUIBundleType;
    SwaggerUIStandalonePreset?: unknown;
    ui?: unknown;
  }
}

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
        await loadScript(
          "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.min.js",
        );

        try {
          await loadScript(
            "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.min.js",
          );
        } catch {
          // preset opcional; se falhar, seguimos sem ele
        }

        const swaggerBundle = window.SwaggerUIBundle;
        if (!swaggerBundle) {
          throw new Error("SwaggerUIBundle indisponível");
        }

        const swaggerStandalonePreset = window.SwaggerUIStandalonePreset;

        window.ui = swaggerBundle({
          url: "/openapi.json",
          dom_id: "#swagger-ui",
          presets: swaggerStandalonePreset
            ? [swaggerBundle.presets.apis, swaggerStandalonePreset]
            : [swaggerBundle.presets.apis],
          layout: "BaseLayout",
        });
      } catch (e) {
        console.error(e);
        const message =
          e instanceof Error
            ? e.message
            : "Nǜo foi poss��vel inicializar a documenta��ǜo";
        setError(message);
      }
    };

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css";
    document.head.appendChild(link);

    void init();
  }, []);

  return (
    <div className="min-h-screen bg-[#1F1F1F] p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
          API Docs
        </h1>
        <p className="text-slate-300 mb-4">
          Documenta��ǜo OpenAPI em{" "}
          <code className="text-amber-400">/openapi.json</code>
        </p>
        {error && <div className="mb-4 text-red-400">{error}</div>}
        <div id="swagger-ui" className="bg-white rounded-md" />
      </div>
    </div>
  );
}

