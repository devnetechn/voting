"use client";

import * as React from "react";

type Props = {
  html: string;
  filename: string;
};

const DownloadReceiptButton: React.FC<Props> = ({ html, filename }) => {
  function download() {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="mx-auto flex w-full max-w-xs items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 sm:w-auto"
    >
      Download Receipt
    </button>
  );
};

export default DownloadReceiptButton;
