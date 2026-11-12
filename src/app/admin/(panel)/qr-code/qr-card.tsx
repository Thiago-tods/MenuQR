"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCard({
  title,
  url,
  filename,
}: {
  title: string;
  url: string;
  filename: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: { dark: "#252521", light: "#FAF7F2" },
    }).then((d) => !cancelled && setDataUrl(d));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <figure className="qr-card border-sand flex flex-col items-center gap-2 rounded-xl border bg-white p-4 text-center">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={`QR Code: ${title}`} width={192} height={192} />
      ) : (
        <div className="skeleton size-48" aria-busy="true" />
      )}
      <figcaption className="font-bold">{title}</figcaption>
      <p className="text-muted text-xs break-all print:hidden">{url}</p>
      {dataUrl && (
        <a
          href={dataUrl}
          download={`${filename}.png`}
          className="btn-secondary print:hidden"
        >
          Baixar PNG
        </a>
      )}
    </figure>
  );
}

export function PrintButton() {
  return (
    <button
      type="button"
      className="btn-secondary print:hidden"
      onClick={() => window.print()}
    >
      Imprimir página
    </button>
  );
}
