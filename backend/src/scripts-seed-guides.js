// Seeds general, educational export-guidance pointers that link to OFFICIAL sources. Review and extend as admin.
import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import { ExportGuide } from './models/ExportGuide.js';
const G = (order, topic, title, content, sourceName, sourceUrl) => ({ order, topic, title, content, sourceName, sourceUrl });
const DISCLAIMER = ' Requirements vary by crop and destination country; always confirm on the official source.';
const items = [
  G(1, 'Finding buyers', 'Start with APEDA', 'APEDA (Agricultural and Processed Food Products Export Development Authority, under the Ministry of Commerce and Industry) is the main government body promoting agricultural exports from India. Its website lists exporter registration information and trade resources.' + DISCLAIMER, 'APEDA', 'https://apeda.gov.in'),
  G(2, 'Documentation', 'Importer-Exporter Code and registration', 'Exporting from India generally requires an Importer-Exporter Code (IEC) issued by DGFT. For many scheduled agricultural products, registration with APEDA is also relevant. Check the current procedure on the DGFT portal.' + DISCLAIMER, 'DGFT', 'https://www.dgft.gov.in'),
  G(3, 'Quality & certification', 'Phytosanitary certification', 'Plants and plant products are commonly exported with a phytosanitary certificate issued by India\'s plant quarantine authorities, because importing countries set plant-health conditions.' + DISCLAIMER, 'Directorate of Plant Protection, Quarantine & Storage', 'https://plantquarantineindia.nic.in'),
  G(4, 'Quality & certification', 'Food safety standards', 'Food products are regulated by FSSAI in India, and importing countries apply their own food-safety rules. Check both the Indian requirements and those of the destination.' + DISCLAIMER, 'FSSAI', 'https://www.fssai.gov.in'),
  G(5, 'Customs', 'Customs procedures overview', 'Export shipments are cleared through Indian Customs. The Central Board of Indirect Taxes and Customs publishes customs notifications and procedures relevant to exporters.' + DISCLAIMER, 'CBIC', 'https://www.cbic.gov.in'),
];
await connectDb();
let added = 0;
for (const g of items) { if (!(await ExportGuide.exists({ title: g.title }))) { await ExportGuide.create(g); added++; } }
console.log(`Seeded ${added} guidance entries`);
await mongoose.disconnect();
