// Categories, bins (India's wet/dry/hazardous system), points, and offline rules.
export const CATEGORIES = {
  plastic:   { label: "Plastic",   bin: "Dry waste (blue bin)",                    points: 10 },
  paper:     { label: "Paper",     bin: "Dry waste (blue bin)",                    points: 8 },
  glass:     { label: "Glass",     bin: "Dry waste, wrapped safely",               points: 12 },
  metal:     { label: "Metal",     bin: "Dry waste (blue bin)",                    points: 12 },
  organic:   { label: "Organic",   bin: "Wet waste (green bin) or compost",        points: 6 },
  ewaste:    { label: "E-waste",   bin: "Authorised e-waste collection point",     points: 25 },
  hazardous: { label: "Hazardous", bin: "Hazardous waste (red bin) or take-back",  points: 20 },
};

// [category, keywords, tip, reuse ideas, est. kg CO2e saved]
const RULES = [
  ["ewaste", ["phone", "charger", "cable", "laptop", "earphone", "headphone", "keyboard", "circuit", "electronic", "gadget", "remote", "tv", "router", "mouse", "tablet pc", "power bank", "adapter"], "Never bin it. Drop it at an authorised e-waste point.", ["Donate or refurbish", "Cable organiser"], 3],
  ["hazardous", ["battery", "cfl", "tube light", "medicine", "paint", "sanitary", "diaper", "syringe"], "Keep it sealed and separate from dry and wet waste.", [], 0.5],
  ["glass", ["glass", "jar", "wine"], "Rinse. Wrap broken pieces in paper before binning.", ["Spice jar", "Candle holder"], 0.3],
  ["metal", ["can", "tin", "foil", "steel", "aluminium", "iron"], "Rinse and flatten. Press sharp lids inside the can.", ["Pen stand", "Herb pot"], 0.5],
  ["paper", ["paper", "newspaper", "cardboard", "carton", "book", "magazine", "box"], "Keep it dry. Flatten and bundle.", ["Papier-mache bowl", "Drawer organiser"], 0.8],
  ["organic", ["peel", "food", "vegetable", "fruit", "tea", "coffee", "leaf", "leaves", "egg", "rice"], "Compost at home or use the wet bin. No oil or meat in home compost.", ["Kitchen compost", "Eco-enzyme cleaner"], 0.2],
  ["plastic", ["plastic", "bottle", "bag", "wrapper", "packet", "container", "straw", "cup"], "Rinse, dry and crush. Give clean plastic to your scrap dealer.", ["Self-watering planter", "Storage box"], 0.1],
];

export function build(item, category, tip, reuse = [], co2 = 0) {
  const c = CATEGORIES[category];
  return { item, category, label: c.label, bin: c.bin, tip, reuse, co2, points: c.points };
}

export function ruleClassify(text = "") {
  const t = text.toLowerCase();
  for (const [category, words, tip, reuse, co2] of RULES)
    if (words.some((w) => t.includes(w))) return build(text.trim(), category, tip, reuse, co2);
  return null;
}
