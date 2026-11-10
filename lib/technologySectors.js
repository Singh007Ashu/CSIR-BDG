// Industrial-application hierarchy observed on TechIndia CSIR, 24 September 2026.
// Source: https://techindiacsir.anusandhan.net/online/Control.do?_tech#industrial_application
// Existing classifications are read, not inferred from descriptions or rewritten.
const rows = [
 ['Aerospace','Aeronautics|Astronautics|Computer applications'],
 ['Agriculture','Agriculture methods|Agricutltural Tools|Agrochemicals|Animal Care and Products|Crops Improvement|Fertilizers|Forestry and Forest related products|Horticulture|Medicinal and Aromatics Plants|Post Harvest|Sericulture|Soil Quality'],
 ['Analytical Techniques','Bio techniques|Chemical Techniques'],
 ['Biological Science','Animals|Bio-instrumentation|Biocatalysts|Biochemicals|Bioinformatics|Biological Science Processes/Methods|Biomolecules|Biotechnology|Marine|Microbial|Plants'],
 ['Building Materials, Construction Technologies, Furniture etc.','Building Materials|Construction Machinery& Equipments|New Techniques'],
 ['Chemistry, Chemical Processes','Agro-processing|Bulk Chemicals|Catalysts|Chemistry, Chemical Processes Polymers|CleanTech|Inorganic materials|Reactors/Plants|Speciality Chemicals'],
 ['Communications','Coding|Communications Networks|Components|Optical|Telephony|Wireless'],
 ['Computers and Electronic Data Processing','Artifical Intelligence|CAD|Cryptanalysis|DSP|Fractals|Graphics|Networks|Real time|Robotics|Security|Simulation|Software'],
 ['Drugs and Pharmaceuticals','Computatuonal Drug Discovery|Drug delivery|Formulations|NCE|Nutraceuticals|Personal care|Synhtesis Procesess|Veterinary Drugs'],
 ['Electrical','Devices|Electrical Measurement|Electrical Transmission'],
 ['Electronics','Computers|Control Systems|Electromechanical|Electronics Components|Electronics Materials|Processes|Sensors|Use/Applications'],
 ['Energy','Conversion|Energy Storage|Production|Systems'],
 ['Environmental (Clean Tech.)','Devices and Equipments|Monitoring|Nuclear waste|Pollution control|Process|Recycling|Waste management|Water treatment'],
 ['Food, Beverages, Tobacco','Animal/Vegetable Products|Beverages|Fermentation|Food Flavouring|Food Processes|Nutrition|Sterilization|Storage|Tobacco'],
 ['Fuels and Lubricants','Biofuel|Catalyst|Fuels and Lubricants Processes|Lubricants|Petroleum Fuels'],
 ['Instrumentation, Appliances, Devices','Analysis|Control|Instrumentation, Appliances, Devices Applications|Measurement|Testing'],
 ['Leather,Textiles and Related Items','Devices/Apparatus|Jute|Leather,Textiles and Related items Applications|Processes/Methods|Textiles'],
 ['Materials','Advanced Materials (Fullerene, Synthetic Diamond)|Applications/Use|Ceramics|Composites|Glass|Materials Processes|Nanomaterials|Polymers'],
 ['Mechanical','Engine and Motors|Machinery/Heavy Equipment|Mechanical Processes|Transmission'],
 ['Medical Devices and Diagnostics','Diagnostics|Implants|Informatics|Radiology'],
 ['Metallurgy','Alloys|Coatings|Making Processes|Metal Recyling'],
 ['Mining and Minerals','Mineral Separation|Mining Equipment|Mining Techniques/Processes|Sludge Treatment'],
 ['Others',''],
 ['Physics','Accelerators|Acoustics|Condensed Matter|Cosmic Rays|Electromagnetics|Fluid Dynamics|Magnetism|Nucleonics|Particle|Plasma|Thermodynamics'],
 ['Transportation','Containers|Material Handling|Rail|Road|Transport|Transportation Marine|Warehouse'],
];
export const TECHNOLOGY_SECTORS = rows.map(([name, children]) => ({ name, children: children ? children.split('|') : [] }));
export const UNCLASSIFIED = 'Classification not recorded';
function normalize(value) { return String(value || '').toLowerCase().replace(/\s+/g,' ').replace(/\s*,\s*/g,',').trim(); }
// Match full labels, including internal commas, with field boundaries. Do not
// split labels such as "Food, Beverages, Tobacco" into three false sectors.
export function hasClassification(value, label) {
  const text=normalize(value), target=normalize(label); let index=text.indexOf(target);
  while(index>=0){ const before=text.slice(0,index).trimEnd(),after=text.slice(index+target.length).trimStart();
    if((!before||/[,;|]$/.test(before))&&(!after||/^[,;|]/.test(after)))return true;
    index=text.indexOf(target,index+1);
  }return false;
}
export function technologySectors(item) { return TECHNOLOGY_SECTORS.filter(s=>hasClassification(item.sector,s.name)).map(s=>s.name); }
export function matchesSector(item, sector, subSector='') {
  if(!sector)return true;
  if(sector===UNCLASSIFIED)return !technologySectors(item).length;
  if(!hasClassification(item.sector,sector))return false;
  if(subSector===UNCLASSIFIED){const entry=TECHNOLOGY_SECTORS.find(s=>s.name===sector);return !entry?.children.some(child=>hasClassification(item.subSector,child));}
  return !subSector||hasClassification(item.subSector,subSector);
}
