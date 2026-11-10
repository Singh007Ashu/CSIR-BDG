const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();

// All 37 CSIR constituent laboratories.
// `code` matches the "Lab" column short-codes used in prisma/data/technologies.json
// (e.g. "CSIR-CFTRI" -> code "CFTRI"), so the technology importer can match labs reliably.
const labs = [
  { code: "AMPRI", name: "CSIR-AMPRI (Advanced Materials and Processes Research Institute)", location: "Bhopal, Madhya Pradesh", expertise: "Advanced Materials, Composites, Waste-to-wealth" },
  { code: "CBRI", name: "CSIR-CBRI (Central Building Research Institute)", location: "Roorkee, Uttarakhand", expertise: "Building Materials, Structural Safety, Disaster Mitigation" },
  { code: "CCMB", name: "CSIR-CCMB (Centre for Cellular and Molecular Biology)", location: "Hyderabad, Telangana", expertise: "Molecular Biology, Genomics, Healthcare" },
  { code: "CDRI", name: "CSIR-CDRI (Central Drug Research Institute)", location: "Lucknow, Uttar Pradesh", expertise: "Pharma, Drug Discovery, Healthcare" },
  { code: "CECRI", name: "CSIR-CECRI (Central Electrochemical Research Institute)", location: "Karaikudi, Tamil Nadu", expertise: "Batteries, Electrochemistry, Corrosion Science" },
  { code: "CEERI", name: "CSIR-CEERI (Central Electronics Engineering Research Institute)", location: "Pilani, Rajasthan", expertise: "Electronics, Sensors, Semiconductors" },
  { code: "CFTRI", name: "CSIR-CFTRI (Central Food Technological Research Institute)", location: "Mysuru, Karnataka", expertise: "Food Processing, Agri-tech, Nutrition" },
  { code: "CGCRI", name: "CSIR-CGCRI (Central Glass and Ceramic Research Institute)", location: "Kolkata, West Bengal", expertise: "Glass, Ceramics, Optical Fibre" },
  { code: "CIMAP", name: "CSIR-CIMAP (Central Institute of Medicinal and Aromatic Plants)", location: "Lucknow, Uttar Pradesh", expertise: "Medicinal Plants, Aromatic Oils, Agri-biotech" },
  { code: "CIMFR", name: "CSIR-CIMFR (Central Institute of Mining and Fuel Research)", location: "Dhanbad, Jharkhand", expertise: "Mining Safety, Coal & Fuel Research" },
  { code: "CLRI", name: "CSIR-CLRI (Central Leather Research Institute)", location: "Chennai, Tamil Nadu", expertise: "Leather Technology, Footwear, Biomaterials" },
  { code: "CMERI", name: "CSIR-CMERI (Central Mechanical Engineering Research Institute)", location: "Durgapur, West Bengal", expertise: "Mechanical Systems, Robotics, Energy" },
  { code: "CRRI", name: "CSIR-CRRI (Central Road Research Institute)", location: "New Delhi", expertise: "Roads, Materials, Infrastructure" },
  { code: "CSIO", name: "CSIR-CSIO (Central Scientific Instruments Organisation)", location: "Chandigarh", expertise: "Scientific & Industrial Instruments, Optics, Avionics" },
  { code: "CSMCRI", name: "CSIR-CSMCRI (Central Salt and Marine Chemicals Research Institute)", location: "Bhavnagar, Gujarat", expertise: "Salt & Marine Chemicals, Desalination" },
  { code: "IGIB", name: "CSIR-IGIB (Institute of Genomics and Integrative Biology)", location: "New Delhi", expertise: "Genomics, Diagnostics, Healthcare" },
  { code: "IHBT", name: "CSIR-IHBT (Institute of Himalayan Bioresource Technology)", location: "Palampur, Himachal Pradesh", expertise: "Himalayan Bioresources, Agri-biotech" },
  { code: "IICB", name: "CSIR-IICB (Indian Institute of Chemical Biology)", location: "Kolkata, West Bengal", expertise: "Chemical Biology, Drug Discovery" },
  { code: "IICT", name: "CSIR-IICT (Indian Institute of Chemical Technology)", location: "Hyderabad, Telangana", expertise: "Chemical Engineering, Materials, Pharma" },
  { code: "IIIM", name: "CSIR-IIIM (Indian Institute of Integrative Medicine)", location: "Jammu", expertise: "Integrative Medicine, Natural Products" },
  { code: "IIP", name: "CSIR-IIP (Indian Institute of Petroleum)", location: "Dehradun, Uttarakhand", expertise: "Hydrocarbons, Petroleum Refining, Fuels" },
  { code: "IITR", name: "CSIR-IITR (Indian Institute of Toxicology Research)", location: "Lucknow, Uttar Pradesh", expertise: "Toxicology, Environmental Health & Safety" },
  { code: "IMMT", name: "CSIR-IMMT (Institute of Minerals and Materials Technology)", location: "Bhubaneswar, Odisha", expertise: "Minerals, Metallurgy, Materials" },
  { code: "IMTECH", name: "CSIR-IMTECH (Institute of Microbial Technology)", location: "Chandigarh", expertise: "Microbial Technology, Biotech, Healthcare" },
  { code: "NAL", name: "CSIR-NAL (National Aerospace Laboratories)", location: "Bengaluru, Karnataka", expertise: "Aerospace, Aeronautics, Composites" },
  { code: "NBRI", name: "CSIR-NBRI (National Botanical Research Institute)", location: "Lucknow, Uttar Pradesh", expertise: "Botany, Plant Biotech, Horticulture" },
  { code: "NCL", name: "CSIR-NCL (National Chemical Laboratory)", location: "Pune, Maharashtra", expertise: "Chemicals, Polymers, Catalysis" },
  { code: "NEERI", name: "CSIR-NEERI (National Environmental Engineering Research Institute)", location: "Nagpur, Maharashtra", expertise: "Water, Environment, Waste Management" },
  { code: "NEIST", name: "CSIR-NEIST (North East Institute of Science and Technology)", location: "Jorhat, Assam", expertise: "Chemical Sciences, Bioresources, Materials" },
  { code: "NGRI", name: "CSIR-NGRI (National Geophysical Research Institute)", location: "Hyderabad, Telangana", expertise: "Geophysics, Mineral & Groundwater Exploration" },
  { code: "NIIST", name: "CSIR-NIIST (National Institute for Interdisciplinary Science and Technology)", location: "Thiruvananthapuram, Kerala", expertise: "Agroprocessing, Chemical Sciences, Materials" },
  { code: "NIO", name: "CSIR-NIO (National Institute of Oceanography)", location: "Goa", expertise: "Ocean Sciences, Marine Technology" },
  { code: "NIScPR", name: "CSIR-NIScPR (National Institute of Science Communication and Policy Research)", location: "New Delhi", expertise: "Science Communication, S&T Policy" },
  { code: "NML", name: "CSIR-NML (National Metallurgical Laboratory)", location: "Jamshedpur, Jharkhand", expertise: "Metallurgy, Materials, Mineral Processing" },
  { code: "NPL", name: "CSIR-NPL (National Physical Laboratory)", location: "New Delhi", expertise: "Metrology, Electronics, AI" },
  { code: "SERC", name: "CSIR-SERC (Structural Engineering Research Centre)", location: "Chennai, Tamil Nadu", expertise: "Structural Engineering, Earthquake & Wind Engineering" },
  { code: "CMMACS", name: "CSIR-4PI (Centre for Mathematical Modelling and Computer Simulation)", location: "Bengaluru, Karnataka", expertise: "Mathematical Modelling, Climate & Environmental Simulation" },
];

// Default Head, BDG login. Change this password after first login in production.
const HEAD_BDG_EMAIL = "head.bdg@csir.res.in";
const HEAD_BDG_PASSWORD = process.env.HEAD_BDG_PASSWORD;

function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  return { passwordHash: hash.toString("hex"), passwordSalt: salt.toString("hex") };
}

async function main() {
  if(!HEAD_BDG_PASSWORD || HEAD_BDG_PASSWORD.length<12)throw new Error("Set a strong HEAD_BDG_PASSWORD before initial setup. Do not seed an existing deployment.");
  for (const lab of labs) {
    await prisma.lab.upsert({
      where: { name: lab.name },
      update: { code: lab.code, location: lab.location, expertise: lab.expertise },
      create: lab,
    });
  }

  const existingHead = await prisma.user.findUnique({ where: { email: HEAD_BDG_EMAIL } });
  if (!existingHead) {
    const { passwordHash, passwordSalt } = hashPasswordSync(HEAD_BDG_PASSWORD);
    await prisma.user.create({
      data: {
        name: "Head, Business Development Group",
        email: HEAD_BDG_EMAIL,
        passwordHash,
        passwordSalt,
        role: "HEAD_BDG",
      },
    });
  }

  console.log(`Seeded ${labs.length} CSIR labs.`);
  console.log(`Head, BDG account: ${HEAD_BDG_EMAIL}. Password is not logged.`);
  console.log(`Industry/Startup users register themselves at /login with their own organization name.`);
  console.log(`Run "npm run db:seed-tech" to import the 1700+ CSIR technologies.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
