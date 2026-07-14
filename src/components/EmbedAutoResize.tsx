"use client";

import { useEffect } from "react";

// When this page is loaded inside an iframe (Chase's website embedding
// /book), its content height changes as the customer steps through the
// form — an iframe with a fixed height would just clip or scroll
// awkwardly. Posts the real height up to the parent window on every
// change; the listener snippet handed to Chase resizes the <iframe> to
// match. No-ops entirely when not actually framed.
export function EmbedAutoResize() {
  useEffect(() => {
    if (window.self === window.top) return;

    function send() {
      window.parent.postMessage(
        { type: "mobi-embed-resize", height: document.body.scrollHeight },
        "*"
      );
    }

    const observer = new ResizeObserver(send);
    observer.observe(document.body);
    send();

    return () => observer.disconnect();
  }, []);

  return null;
}
