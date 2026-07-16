export type WebsiteWidget = {
  id: string;
  title: string;
  description: string;
  directLink: string;
  html: string;
};

type WidgetCategory = { id: string; name: string };

function embedHtml(widgetId: string, src: string) {
  const frameId = `rt-widget-${widgetId}`;
  return `<iframe id="${frameId}" src="${src}" style="width:100%;max-width:480px;border:none;min-height:900px;" title="Book Online"></iframe>
<script>
  window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "mobi-embed-resize") {
      var frame = document.getElementById("${frameId}");
      if (frame) frame.style.height = event.data.height + "px";
    }
  });
</script>`;
}

// Ready-to-paste embed code for the public booking page — one per bookable
// category (so a link from e.g. a "Junk Removal" section on the business's
// own site jumps straight to that category instead of the full picker)
// plus one covering every service. Always built live from real categories
// and the resolved booking URL, so nothing here goes stale the way a saved
// WebsiteSnippet could — there's nothing to store.
export function buildWebsiteWidgets(categories: WidgetCategory[], baseUrl: string): WebsiteWidget[] {
  const allServices: WebsiteWidget = {
    id: "all",
    title: "All Services",
    description: "The full \"what do you need?\" picker, covering every bookable category.",
    directLink: `${baseUrl}/book`,
    html: embedHtml("all", `${baseUrl}/book?embed=1`),
  };

  const perCategory: WebsiteWidget[] = categories.map((category) => ({
    id: category.id,
    title: category.name,
    description: `Skips the picker and jumps straight to ${category.name}.`,
    directLink: `${baseUrl}/book?category=${encodeURIComponent(category.name)}`,
    html: embedHtml(category.id, `${baseUrl}/book?embed=1&category=${encodeURIComponent(category.name)}`),
  }));

  return [allServices, ...perCategory];
}
