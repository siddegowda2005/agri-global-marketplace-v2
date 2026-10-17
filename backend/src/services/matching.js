// Transparent rule-based scoring. Never claims a company has agreed to buy.
export function scoreCompany(company, { crop, country }) {
  const c = String(crop || '').trim().toLowerCase();
  const reasons = []; let score = 0;
  if (c && company.productsHandled?.some((p) => p === c || p.includes(c) || c.includes(p))) {
    score += 60; reasons.push(`This company publicly lists ${c} among the products it handles.`);
  } else return null;
  if (company.verificationStatus === 'verified') { score += 20; reasons.push('Company record verified by an admin against its public source.'); }
  if (country && company.country.toLowerCase() === String(country).toLowerCase()) { score += 20; reasons.push(`Located in your target country (${company.country}).`); }
  return { score, reasons };
}
export function matchCompanies(companies, query) {
  return companies.map((co) => { const m = scoreCompany(co, query); return m && { company: co, ...m }; })
    .filter(Boolean).sort((a, b) => b.score - a.score);
}
export function buildEnquiry({ farmerName, cropName, quantity, unit, location }) {
  const subject = 'Agricultural Product Supply Enquiry From India';
  const body = `Dear Procurement Team,\n\nI am an agricultural producer from ${location}.\n\nI would like to enquire about supplying fresh agricultural products to your company.\n\nCrop: ${cropName}\nQuantity: ${quantity} ${unit}\nLocation: ${location}\n\nPlease share your current sourcing requirements and quality specifications.\n\nThank you.\n${farmerName}`;
  return { subject, body };
}
export const mailtoLink = (email, subject, body) => `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
