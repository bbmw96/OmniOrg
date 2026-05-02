// Created by BBMW0 Technologies | bbmw0.com

export interface AffiliateProduct {
  name: string;
  category: string;
  asin: string;
  affiliateUrl: string;
  keywords: string[];
  priceRange: string;
  commissionRate: string;
}

export interface AffiliateInjectionResult {
  originalDescription: string;
  enhancedDescription: string;
  productsInjected: AffiliateProduct[];
  estimatedCommission: string;
  disclosureAdded: boolean;
}

// ── PRODUCT catalogue ────────────────────────────────────────────────────────────

const PRODUCT_CATALOG: AffiliateProduct[] = [
  {
    name: "DaVinci Resolve: The Complete Guide (Book)",
    category: "books",
    asin: "B0C1XAMPLE1",
    affiliateUrl: "https://www.amazon.co.uk/dp/B0C1XAMPLE1?tag=bbmw0-21",
    keywords: ["davinci resolve", "colour grading", "video editing", "post-production", "editing software"],
    priceRange: "£15-£30",
    commissionRate: "4-6%",
  },
  {
    name: "Adobe Premiere Pro: The Complete Course (Book)",
    category: "books",
    asin: "B0C2XAMPLE2",
    affiliateUrl: "https://www.amazon.co.uk/dp/B0C2XAMPLE2?tag=bbmw0-21",
    keywords: ["premiere pro", "adobe", "video editing", "post-production", "editing software"],
    priceRange: "£20-£35",
    commissionRate: "4-6%",
  },
  {
    name: "Blue Yeti USB Microphone",
    category: "microphones",
    asin: "B00N1YPXW2",
    affiliateUrl: "https://www.amazon.co.uk/dp/B00N1YPXW2?tag=bbmw0-21",
    keywords: ["microphone", "audio", "recording", "podcast", "voiceover", "usb mic"],
    priceRange: "£100-£130",
    commissionRate: "3-5%",
  },
  {
    name: "Rode NT-USB Mini USB Microphone",
    category: "microphones",
    asin: "B08GKXQ3KL",
    affiliateUrl: "https://www.amazon.co.uk/dp/B08GKXQ3KL?tag=bbmw0-21",
    keywords: ["microphone", "audio", "recording", "rode", "voiceover", "usb mic", "podcast"],
    priceRange: "£90-£110",
    commissionRate: "3-5%",
  },
  {
    name: "Elgato Key Light: Professional LED Panel",
    category: "lighting",
    asin: "B07L755X9G",
    affiliateUrl: "https://www.amazon.co.uk/dp/B07L755X9G?tag=bbmw0-21",
    keywords: ["lighting", "key light", "studio light", "streaming", "youtube setup", "ring light"],
    priceRange: "£150-£200",
    commissionRate: "3-5%",
  },
  {
    name: "Ring Light Kit with Stand: 18 inch LED",
    category: "lighting",
    asin: "B0C3XAMPLE3",
    affiliateUrl: "https://www.amazon.co.uk/dp/B0C3XAMPLE3?tag=bbmw0-21",
    keywords: ["ring light", "lighting", "youtube setup", "streaming", "portrait lighting"],
    priceRange: "£35-£60",
    commissionRate: "3-5%",
  },
  {
    name: "Elgato HD60 S+ Capture Card",
    category: "capture-cards",
    asin: "B07XB6VNLS",
    affiliateUrl: "https://www.amazon.co.uk/dp/B07XB6VNLS?tag=bbmw0-21",
    keywords: ["capture card", "elgato", "4k", "screen capture", "gameplay", "hdmi capture"],
    priceRange: "£150-£180",
    commissionRate: "3-5%",
  },
  {
    name: "Samsung PRO Plus microSDXC 256GB",
    category: "storage",
    asin: "B09TGLLZJG",
    affiliateUrl: "https://www.amazon.co.uk/dp/B09TGLLZJG?tag=bbmw0-21",
    keywords: ["sd card", "memory card", "storage", "camera storage", "4k recording"],
    priceRange: "£25-£45",
    commissionRate: "3-5%",
  },
  {
    name: "Samsung T7 Portable SSD 1TB",
    category: "storage",
    asin: "MU-PC1T0T/WW",
    affiliateUrl: "https://www.amazon.co.uk/dp/MU-PC1T0T/WW?tag=bbmw0-21",
    keywords: ["ssd", "external ssd", "storage", "portable drive", "editing drive", "fast storage"],
    priceRange: "£80-£110",
    commissionRate: "3-5%",
  },
  {
    name: "Samsung T7 Shield Portable SSD 2TB",
    category: "storage",
    asin: "B09VL5FGPQ",
    affiliateUrl: "https://www.amazon.co.uk/dp/B09VL5FGPQ?tag=bbmw0-21",
    keywords: ["ssd", "external ssd", "2tb", "storage", "editing drive", "fast storage", "rugged"],
    priceRange: "£150-£180",
    commissionRate: "3-5%",
  },
  {
    name: "Logitech Brio 4K Pro Webcam",
    category: "webcams",
    asin: "B01N5UOYC4",
    affiliateUrl: "https://www.amazon.co.uk/dp/B01N5UOYC4?tag=bbmw0-21",
    keywords: ["webcam", "4k webcam", "logitech", "streaming", "youtube setup", "camera"],
    priceRange: "£150-£200",
    commissionRate: "3-5%",
  },
  {
    name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
    category: "headphones",
    asin: "B09XS7JWHH",
    affiliateUrl: "https://www.amazon.co.uk/dp/B09XS7JWHH?tag=bbmw0-21",
    keywords: ["headphones", "audio monitoring", "noise cancelling", "sony", "editing headphones", "mixing"],
    priceRange: "£280-£350",
    commissionRate: "3-5%",
  },
  {
    name: "Elmo Green Screen Backdrop Kit: 6×9 ft",
    category: "green-screen",
    asin: "B0C4XAMPLE4",
    affiliateUrl: "https://www.amazon.co.uk/dp/B0C4XAMPLE4?tag=bbmw0-21",
    keywords: ["green screen", "chroma key", "background", "streaming setup", "vfx"],
    priceRange: "£30-£60",
    commissionRate: "3-5%",
  },
  {
    name: "Neewer Collapsible Green Screen 5×7 ft",
    category: "green-screen",
    asin: "B0C5XAMPLE5",
    affiliateUrl: "https://www.amazon.co.uk/dp/B0C5XAMPLE5?tag=bbmw0-21",
    keywords: ["green screen", "chroma key", "collapsible", "portable", "background removal"],
    priceRange: "£40-£70",
    commissionRate: "3-5%",
  },
  {
    name: "SanDisk Extreme PRO SDXC 128GB",
    category: "storage",
    asin: "B07H9DVLBB",
    affiliateUrl: "https://www.amazon.co.uk/dp/B07H9DVLBB?tag=bbmw0-21",
    keywords: ["sd card", "sandisk", "memory card", "4k", "camera storage", "fast sd"],
    priceRange: "£20-£40",
    commissionRate: "3-5%",
  },
  {
    name: "Audio-Technica ATH-M50x Professional Headphones",
    category: "headphones",
    asin: "B00HVLUR54",
    affiliateUrl: "https://www.amazon.co.uk/dp/B00HVLUR54?tag=bbmw0-21",
    keywords: ["headphones", "studio headphones", "audio monitoring", "mixing", "mastering", "editing headphones"],
    priceRange: "£120-£160",
    commissionRate: "3-5%",
  },
  {
    name: "Elgato Stream Deck MK.2: 15 LCD Key Controller",
    category: "accessories",
    asin: "B09738CV2G",
    affiliateUrl: "https://www.amazon.co.uk/dp/B09738CV2G?tag=bbmw0-21",
    keywords: ["stream deck", "elgato", "shortcuts", "streaming", "productivity", "workflow"],
    priceRange: "£120-£150",
    commissionRate: "3-5%",
  },
  {
    name: "Godox SL60W LED Video Light",
    category: "lighting",
    asin: "B07GDHS871",
    affiliateUrl: "https://www.amazon.co.uk/dp/B07GDHS871?tag=bbmw0-21",
    keywords: ["video light", "studio light", "godox", "led light", "youtube lighting", "professional lighting"],
    priceRange: "£70-£100",
    commissionRate: "3-5%",
  },
  {
    name: "SAMSUNG 870 EVO SATA SSD 2TB",
    category: "storage",
    asin: "B08QBJ2YMG",
    affiliateUrl: "https://www.amazon.co.uk/dp/B08QBJ2YMG?tag=bbmw0-21",
    keywords: ["internal ssd", "sata ssd", "storage upgrade", "editing pc", "fast storage", "samsung ssd"],
    priceRange: "£120-£160",
    commissionRate: "3-5%",
  },
  {
    name: "Corsair HS80 RGB Wireless Gaming Headset",
    category: "headphones",
    asin: "B09B3V7GXH",
    affiliateUrl: "https://www.amazon.co.uk/dp/B09B3V7GXH?tag=bbmw0-21",
    keywords: ["headset", "wireless headphones", "gaming headset", "audio", "editing headphones"],
    priceRange: "£90-£130",
    commissionRate: "3-5%",
  },
];

// ── AFFILIATE ENGINE ───────────────────────────────────────────────────────────

export class AffiliateEngine {

  /**
   * Selects 2-4 relevant products based on tags and topic keyword matching,
   * then appends a gear section and FTC/ASA disclosure to the description.
   */
  injectIntoDescription(
    description: string,
    tags: string[],
    topic: string,
  ): AffiliateInjectionResult {
    const relevantProducts = this._selectRelevantProducts(tags, topic, 2, 4);

    if (relevantProducts.length === 0) {
      return {
        originalDescription: description,
        enhancedDescription: description,
        productsInjected: [],
        estimatedCommission: "£0/month",
        disclosureAdded: false,
      };
    }

    const gearSection = this._buildGearSection(relevantProducts);
    const disclosure =
      "\n\n📢 Some links are affiliate links. I earn a small commission at no extra cost to you.";
    const enhancedDescription = `${description}${gearSection}${disclosure}`;

    return {
      originalDescription: description,
      enhancedDescription,
      productsInjected: relevantProducts,
      estimatedCommission: this.estimateMonthlyCommission(10_000, 0.02),
      disclosureAdded: true,
    };
  }

  /**
   * Returns all products belonging to the specified category.
   */
  getProductsByCategory(category: string): AffiliateProduct[] {
    return PRODUCT_CATALOG.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase(),
    );
  }

  /**
   * Returns all products whose keyword list intersects with the supplied keywords.
   * Results are deduplicated and sorted by match count descending.
   */
  getProductsByKeywords(keywords: string[]): AffiliateProduct[] {
    const normalised = keywords.map((k) => k.toLowerCase());

    const scored = PRODUCT_CATALOG.map((product) => ({
      product,
      score: product.keywords.filter((kw) => normalised.includes(kw.toLowerCase()))
        .length,
    }));

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.product);
  }

  /**
   * Estimates monthly affiliate commission revenue.
   * Formula: views × ctr × 0.05 (conversion) × £3 avg commission.
   * Returns a formatted range string.
   */
  estimateMonthlyCommission(monthlyViews: number, ctr: number): string {
    const clicks = monthlyViews * ctr;
    const conversions = clicks * 0.05;
    const avgCommission = 3;
    const mid = conversions * avgCommission;
    const low = Math.floor(mid * 0.7);
    const high = Math.ceil(mid * 1.3);
    return `£${low}-£${high}/month`;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private _selectRelevantProducts(
    tags: string[],
    topic: string,
    min: number,
    max: number,
  ): AffiliateProduct[] {
    const searchTerms = [
      ...tags.map((t) => t.toLowerCase()),
      ...topic.toLowerCase().split(/\s+/),
    ];

    const scored = PRODUCT_CATALOG.map((product) => ({
      product,
      score: product.keywords.filter((kw) =>
        searchTerms.some((term) => kw.includes(term) || term.includes(kw)),
      ).length,
    }));

    const matched = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.product)
      .slice(0, max);

    if (matched.length >= min) return matched;

    // Pad with high-value evergreen products if below minimum
    const fallbacks = PRODUCT_CATALOG.filter(
      (p) => !matched.includes(p) && p.category === "storage",
    ).slice(0, min - matched.length);

    return [...matched, ...fallbacks].slice(0, max);
  }

  private _buildGearSection(products: AffiliateProduct[]): string {
    const lines = products.map((p) => `• ${p.name} → ${p.affiliateUrl}`).join("\n");
    return `\n\n🛠️ GEAR & SOFTWARE I USE:\n${lines}`;
  }
}

export const affiliateEngine = new AffiliateEngine();
export default affiliateEngine;
