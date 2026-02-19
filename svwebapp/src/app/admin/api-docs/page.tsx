"use client";

import Script from "next/script";

export default function ApiDocsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">API Documentation</h1>
        <p className="text-sm text-muted-foreground">
          Interactive reference for the SwagVault REST API v1
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div id="api-docs" />
      </div>

      <Script
        src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const win = window as any;
          if (win.Scalar) {
            win.Scalar.createApiReference("#api-docs", {
              url: "/api/v1/openapi.json",
              theme: "kepler",
              hideDownloadButton: true,
            });
          }
        }}
      />
    </div>
  );
}
