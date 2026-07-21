import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  // Extract the property ID from /property/:id
  const propertyId = pathParts[2];

  if (!propertyId) {
    return context.next();
  }

  // Check if the request comes from a bot/crawler that reads OG tags
  // (WhatsApp, Facebook, Telegram, LinkedIn, etc.)
  // Regular browsers get the normal SPA — the JS handles the rest
  const userAgent = request.headers.get("user-agent") || "";
  const isCrawler = /facebookexternalhit|WhatsApp|Twitterbot|TelegramBot|LinkedInBot|Slackbot|Discordbot|googlebot|bingbot|yandex/i.test(userAgent);

  if (!isCrawler) {
    return context.next();
  }

  // Fetch property data from Supabase REST API
  const supabaseUrl = Netlify.env.get("VITE_SUPABASE_URL");
  const supabaseKey = Netlify.env.get("VITE_SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error("[OG Edge] Missing Supabase env vars");
    return context.next();
  }

  try {
    const apiUrl = `${supabaseUrl}/rest/v1/properties?id=eq.${propertyId}&select=title,price,image_url,location,listing_type,short_description,description,is_published&limit=1`;

    const res = await fetch(apiUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!res.ok) {
      console.error("[OG Edge] Supabase fetch failed:", res.status);
      return context.next();
    }

    const data = await res.json();

    if (!data || data.length === 0 || !data[0].is_published) {
      return context.next();
    }

    const property = data[0];
    const price = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(property.price);

    const listingLabel = property.listing_type === "rent" ? "Alquiler" : "Venta";
    const ogTitle = `${property.title} — ${price} | Lago Realty`;
    const ogDescription = property.short_description || property.description?.substring(0, 160) || `Propiedad en ${listingLabel} en ${property.location}. Conoce los detalles en Lago Realty.`;
    const rawImageUrl = property.image_url?.startsWith("http")
      ? property.image_url
      : `${supabaseUrl}/storage/v1/object/public/${property.image_url}`;
    
    // Usamos un proxy de imágenes para redimensionar a 1200x630 (ideal para WhatsApp)
    // y arreglar problemas de parseo con espacios o paréntesis en la URL original
    const encodedImageUrl = encodeURIComponent(rawImageUrl);
    const ogImage = `https://wsrv.nl/?url=${encodedImageUrl}&w=1200&h=630&fit=cover&output=jpg&q=80`;
    const ogUrl = `https://lagorealty.com.ve/property/${propertyId}`;

    // Get the original HTML response
    const response = await context.next();
    const html = await response.text();

    // Inject dynamic OG tags by replacing the static ones
    const dynamicHtml = html
      // Title
      .replace(
        /<title>.*?<\/title>/,
        `<title>${escapeHtml(ogTitle)}</title>`
      )
      // Meta description
      .replace(
        /<meta name="description" content=".*?">/,
        `<meta name="description" content="${escapeHtml(ogDescription)}">`
      )
      // OG Title
      .replace(
        /<meta property="og:title" content=".*?">/,
        `<meta property="og:title" content="${escapeHtml(ogTitle)}">`
      )
      // OG Description
      .replace(
        /<meta property="og:description" content=".*?">/,
        `<meta property="og:description" content="${escapeHtml(ogDescription)}">`
      )
      // OG Image
      .replace(
        /<meta property="og:image" content=".*?">/,
        `<meta property="og:image" content="${escapeHtml(ogImage)}">`
      )
      // OG URL
      .replace(
        /<meta property="og:url" content=".*?">/,
        `<meta property="og:url" content="${escapeHtml(ogUrl)}">`
      )
      // OG Type — property page is an "article"
      .replace(
        /<meta property="og:type" content=".*?">/,
        `<meta property="og:type" content="article">`
      );

    return new Response(dynamicHtml, {
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "content-type": "text/html;charset=UTF-8",
      },
    });
  } catch (err) {
    console.error("[OG Edge] Error:", err);
    return context.next();
  }
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
