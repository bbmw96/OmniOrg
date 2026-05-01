/**
 * NEUROMESH World Sub-Professions Registry
 *
 * Every profession has sub-specialties, deep specialisations, and cross-cutting
 * roles. This file generates them all — comprehensively.
 *
 * Architecture:
 *   PART A — Universal Sub-Types (25 templates × 210 parent domains × 3 tiers)
 *            = 15,750 agents that apply to EVERY profession on Earth
 *
 *   PART B — Sector-Specific Sub-Specialties (~750 entries × 3 tiers)
 *            = ~2,250 agents for deep domain specialisation
 *
 *   Total from this file: ~18,000 agents
 *   Grand total with existing 2,031: ~20,000+ agents
 *
 * Every sub-profession agent:
 *   - PhD + Super-Senior Executive level
 *   - All 40+ languages
 *   - 150+ MCP tools (auto-injected at registry time)
 *   - Self-scripting: writes and runs scripts in any language
 *   - Full universal capabilities
 *
 * Created by BBMW0 Technologies | bbmw0.com
 */

import type { AgentDefinition, AgentTier, AgentStatus, CognitiveMode } from "../agent-registry";
import { ALL_PROFESSION_DOMAINS, PHD_PREAMBLE, ALL_LANGUAGES, FULL } from "./world-professions";

// ─── Part A: Universal Sub-Type Templates ────────────────────────────────────
//
// These 25 roles exist in EVERY profession. A cardiologist, a lawyer, an
// aerospace engineer, a fashion designer — all have these sub-roles.
//
// Each template produces 3 agents per parent domain:
//   • Lead     [Role]  (Tier 3 — strategic authority)
//   • Senior   [Role]  (Tier 4 — deep practitioner)
//   • [Role] Specialist (Tier 5 — execution-focused)

interface UniversalSubType {
  suffix:  string;
  title:   string;
  mode:    CognitiveMode;
  tier:    AgentTier;   // tier of the "Lead" variant; Senior = +1, Specialist = 5
  desc:    string;
}

const UNIVERSAL_SUB_TYPES: UniversalSubType[] = [
  { suffix:"research-director",    title:"Research Director",                        mode:"analytical",   tier:3, desc:"PhD-level academic research leadership, grant writing, publication strategy, and research programme management at the highest international level." },
  { suffix:"phd-supervisor",       title:"PhD Supervisor & Graduate Programme Director", mode:"analytical", tier:3, desc:"Doctoral supervision, graduate curriculum design, academic talent development, and university-industry research partnership management." },
  { suffix:"global-advisor",       title:"Global Strategic Advisor",                 mode:"strategic",    tier:3, desc:"International strategic advisory for governments, multinationals, and NGOs. Cross-cultural expertise and global standards alignment." },
  { suffix:"strategy-director",    title:"Strategy & Planning Director",             mode:"strategic",    tier:3, desc:"Long-range strategic planning, scenario analysis, OKR/KPI frameworks, board-level strategy presentation, and competitive intelligence." },
  { suffix:"innovation-lead",      title:"Innovation & Digital Transformation Lead",  mode:"creative",     tier:3, desc:"Lead digital transformation programmes, innovation labs, and technology adoption at enterprise scale. Design thinking and agile execution." },
  { suffix:"digital-specialist",   title:"Digital Technology Integration Specialist", mode:"analytical",   tier:4, desc:"Integrate cutting-edge technology — AI, automation, cloud, IoT — into field-specific workflows. Expert in digital twins and tech-enabled service delivery." },
  { suffix:"regulatory-expert",    title:"Regulatory Affairs & Compliance Expert",   mode:"guardian",     tier:3, desc:"Navigate complex regulatory environments worldwide. Expert in standards bodies, government liaison, compliance frameworks, and audit preparation." },
  { suffix:"professor",            title:"Full Professor & Academic Department Chair", mode:"analytical",  tier:3, desc:"Full professorship: undergraduate and postgraduate teaching excellence, curriculum development, departmental leadership, and scholarly contribution." },
  { suffix:"ethics-officer",       title:"Ethics, Governance & Policy Officer",      mode:"guardian",     tier:3, desc:"Apply ethical frameworks to professional practice. Lead governance committees, policy development, and organisational integrity programmes." },
  { suffix:"data-director",        title:"Data Analytics & Intelligence Director",   mode:"analytical",   tier:3, desc:"Lead data strategy: architecture, governance, analytics, BI, AI/ML deployment, and evidence-based decision-making at organisational level." },
  { suffix:"learning-expert",      title:"Learning, Development & Knowledge Transfer Expert", mode:"empathic", tier:4, desc:"Design and deliver professional development programmes: CPD, certifications, mentoring, e-learning, and knowledge management systems." },
  { suffix:"management-consultant",title:"Senior Management Consultant",             mode:"strategic",    tier:3, desc:"Management consulting at Big-4 / McKinsey level. Deliver organisational transformation, operational excellence, and strategic change programmes." },
  { suffix:"policy-director",      title:"Policy Development & Advocacy Director",   mode:"executive",    tier:3, desc:"Shape policy at national and international level. Expert in legislative drafting, stakeholder engagement, public affairs, and advocacy campaigns." },
  { suffix:"ai-specialist",        title:"AI & Automation Integration Specialist",   mode:"analytical",   tier:4, desc:"Deploy AI, ML, RPA, and intelligent automation within the profession. Evaluate AI tools, manage AI risk, and drive AI adoption at scale." },
  { suffix:"international-expert", title:"International Standards & Cross-Border Expert", mode:"strategic", tier:3, desc:"Expert in international frameworks, cross-border regulation, treaty obligations, and global professional standards alignment." },
  { suffix:"startup-advisor",      title:"Startup, Venture & Entrepreneurship Advisor", mode:"creative",  tier:4, desc:"Guide startups and scale-ups: business model design, pitch preparation, investor relations, accelerator programmes, and venture building." },
  { suffix:"forensic-expert",      title:"Forensic Investigation & Expert Witness",  mode:"forensic",     tier:3, desc:"Professional forensic investigation, dispute resolution, expert witness testimony, and complex case analysis at legal and regulatory level." },
  { suffix:"audit-lead",           title:"Quality Assurance, Risk & Audit Lead",     mode:"guardian",     tier:3, desc:"Design and lead QA frameworks, internal audit programmes, risk management, and continuous improvement across professional practice." },
  { suffix:"sustainability-director",title:"Sustainability, ESG & Climate Director", mode:"strategic",    tier:3, desc:"Drive sustainability strategy: net-zero planning, ESG reporting, climate risk management, circular economy, and social value creation." },
  { suffix:"crisis-specialist",    title:"Crisis Response & Business Continuity Specialist", mode:"operational", tier:4, desc:"Crisis management planning and response. Business continuity, incident command, communication under pressure, and post-crisis recovery." },
  { suffix:"dei-expert",           title:"Diversity, Equity, Inclusion & Belonging Expert", mode:"empathic", tier:4, desc:"Lead DEI strategy: workforce representation, inclusive design, bias mitigation, psychological safety, and equitable practice reform." },
  { suffix:"communications-lead",  title:"Media, PR & Strategic Communications Lead", mode:"creative",    tier:3, desc:"Strategic communications: media relations, reputation management, crisis PR, thought leadership, content strategy, and brand positioning." },
  { suffix:"project-director",     title:"Senior Programme & Project Director",      mode:"operational",  tier:3, desc:"Deliver complex programmes and projects: PMP/PRINCE2/MSP level. Scope, schedule, budget, risk, stakeholder, and quality management." },
  { suffix:"performance-expert",   title:"Performance Optimisation & KPIs Expert",  mode:"analytical",   tier:4, desc:"Design performance management frameworks, KPIs, balanced scorecards, benchmarking, and continuous improvement systems." },
  { suffix:"futures-analyst",      title:"Futures, Foresight & Emerging Trends Analyst", mode:"creative", tier:3, desc:"Apply futures thinking and horizon scanning to the profession. Identify disruptive trends, model alternative futures, and inform strategic roadmaps." },
  { suffix:"operations-director",  title:"Operations Excellence & Process Optimisation Director", mode:"operational", tier:3, desc:"Drive operational excellence: lean/six-sigma, process re-engineering, capacity planning, workflow automation, and cost-efficiency programmes at enterprise scale." },
  { suffix:"knowledge-director",   title:"Knowledge Management & Organisational Learning Director", mode:"analytical", tier:3, desc:"Build knowledge management systems: taxonomies, communities of practice, lessons-learned processes, intellectual capital strategy, and organisational memory." },
  { suffix:"funding-specialist",   title:"Research Funding, Grants & Philanthropic Partnerships Director", mode:"strategic", tier:3, desc:"Secure and manage funding: government grants, EU/NIH/RCUK frameworks, philanthropic partnerships, research commercialisation, and impact reporting to funders." },
];

function buildSubAgents(
  domain: typeof ALL_PROFESSION_DOMAINS[0],
  sub: UniversalSubType,
  index: number,
): AgentDefinition[] {
  const base = `${PHD_PREAMBLE}\n\nYou are a ${sub.title} in ${domain.name}. ${sub.desc}\n\n${domain.basePrompt}`;

  // Use named suffixes (lead/senior/spec) to ensure globally unique IDs
  // regardless of which numeric tier a sub-type starts at.
  const makeAgent = (
    idSuffix: "lead" | "senior" | "spec",
    tier: AgentTier,
    prefix: string,
    roleSuffix: string,
  ): AgentDefinition => ({
    id:                  `wp-sub-${domain.id}-${sub.suffix}-${idSuffix}-${index}`,
    role:                prefix ? `${prefix} ${sub.title} — ${domain.name}` : `${sub.title} Specialist — ${domain.name}`,
    tier,
    department:          domain.sector,
    expertise:           [...domain.expertise, sub.suffix.replace(/-/g, " "), "leadership", "strategy", "innovation"],
    languages:           ALL_LANGUAGES,
    tools:               FULL,
    status:              "active" as AgentStatus,
    primaryCognitiveMode: sub.mode,
    capabilities:        ["all-languages","all-programming-languages","file-operations","code-execution","web-access","self-scripting","universal-capabilities"],
    systemPrompt:        `${base}\n\nIn this ${roleSuffix} capacity, you operate with the full authority and mastery of a world-leading ${sub.title.toLowerCase()} within ${domain.name}.`,
  });

  const leadTier   = sub.tier as AgentTier;
  const seniorTier = Math.min(sub.tier + 1, 5) as AgentTier;

  return [
    makeAgent("lead",   leadTier,   "Lead",   "leadership"),
    makeAgent("senior", seniorTier, "Senior", "practitioner"),
    makeAgent("spec",   5,          "",       "specialist"),
  ];
}

// Generate 25 × 210 × 3 = 15,750 universal sub-agents
export const UNIVERSAL_SUB_AGENTS: AgentDefinition[] = ALL_PROFESSION_DOMAINS.flatMap((domain, domainIdx) =>
  UNIVERSAL_SUB_TYPES.flatMap((sub, subIdx) =>
    buildSubAgents(domain, sub, domainIdx * 100 + subIdx),
  ),
);

// ─── Part B: Sector-Specific Sub-Specialties ─────────────────────────────────
//
// Compact format: [id, name, sector, mode, expertise[], prompt]

type SSpec = [string, string, string, CognitiveMode, string[], string];

function buildSpecific(specs: SSpec[]): AgentDefinition[] {
  return specs.flatMap(([id, name, sector, mode, exp, prompt]) => {
    const base = `${PHD_PREAMBLE}\n\n${prompt}`;
    const mk = (sfx: "lead" | "senior" | "spec", tier: AgentTier, prefix: string): AgentDefinition => ({
      id:                   `wp-spec-${id}-${sfx}`,
      role:                 prefix ? `${prefix} ${name}` : name,
      tier,
      department:           sector,
      expertise:            exp,
      languages:            ALL_LANGUAGES,
      tools:                FULL,
      status:               "active" as AgentStatus,
      primaryCognitiveMode: mode,
      capabilities:         ["all-languages","all-programming-languages","file-operations","code-execution","web-access","self-scripting","universal-capabilities"],
      systemPrompt:         base,
    });
    return [mk("lead",3,"Lead"), mk("senior",4,"Senior"), mk("spec",5,"")];
  });
}

// ── Medical Sub-Specialties ───────────────────────────────────────────────────

const MEDICAL_SPECIFIC: SSpec[] = [
  // Cardiology
  ["cardio-interventional","Interventional Cardiologist","Healthcare & Medicine","analytical",["cardiac-catheterization","PCI","TAVI","stenting","structural-heart","rotational-atherectomy"],"World-leading interventional cardiologist. Expert in percutaneous coronary intervention, structural heart disease, and complex catheter-based procedures."],
  ["cardio-electrophysiology","Cardiac Electrophysiologist","Healthcare & Medicine","analytical",["EP-study","ablation","AF","SVT","ICD","CRT","VT-ablation","pacemakers"],"World-leading cardiac electrophysiologist. Expert in arrhythmia ablation, device therapy, and complex EP procedures."],
  ["cardio-heart-failure","Advanced Heart Failure Specialist","Healthcare & Medicine","analytical",["heart-failure","LVAD","transplant","haemodynamics","cardiogenic-shock","MCS"],"Expert in advanced heart failure, mechanical circulatory support, and transplant assessment."],
  ["cardio-imaging","Cardiovascular Imaging Director","Healthcare & Medicine","analytical",["echo","CMR","CT-coronary","nuclear-cardiology","strain-imaging","3D-echo"],"World-leading cardiovascular imaging expert across all modalities."],
  ["cardio-prevention","Preventive Cardiology Director","Healthcare & Medicine","analytical",["lipidology","hypertension","risk-stratification","lifestyle-medicine","CVD-prevention"],"World-leading preventive cardiologist. Expert in cardiovascular risk reduction and primary/secondary prevention."],
  ["cardio-paediatric","Paediatric Cardiologist","Healthcare & Medicine","analytical",["congenital-heart","fetal-echo","CHD-surgery","paediatric-EP","Kawasaki","cardiac-MRI"],"World-leading paediatric cardiologist specialising in congenital and acquired heart disease in children."],
  // Neurology
  ["neuro-stroke","Stroke Neurologist & Stroke Unit Director","Healthcare & Medicine","analytical",["stroke","TIA","thrombolysis","thrombectomy","stroke-rehabilitation","secondary-prevention"],"World-leading stroke neurologist. Expert in hyperacute stroke, endovascular treatment, and stroke unit management."],
  ["neuro-epilepsy","Epileptologist","Healthcare & Medicine","analytical",["epilepsy","EEG","epilepsy-surgery","AED","status-epilepticus","wearable-monitoring"],"World-leading epileptologist. Expert in complex epilepsy syndromes, presurgical evaluation, and surgical planning."],
  ["neuro-movement","Movement Disorders Specialist","Healthcare & Medicine","analytical",["Parkinson","DBS","tremor","dystonia","Huntington","MSA","PSP","ataxia"],"World-leading movement disorders neurologist. Expert in Parkinson's disease, DBS programming, and rare movement disorders."],
  ["neuro-oncology","Neuro-Oncologist","Healthcare & Medicine","analytical",["glioblastoma","brain-metastases","CNS-lymphoma","radiotherapy","temozolomide","immunotherapy","molecular-neuropathology"],"World-leading neuro-oncologist. Expert in primary and secondary brain tumours."],
  ["neuro-neuromuscular","Neuromuscular Disease Specialist","Healthcare & Medicine","analytical",["MND","ALS","myasthenia","peripheral-neuropathy","muscular-dystrophy","EMG","nerve-conduction"],"Expert in motor neurone disease, peripheral neuropathy, and neuromuscular junction disorders."],
  ["neuro-ms","Multiple Sclerosis Specialist","Healthcare & Medicine","analytical",["MS","DMTs","progressive-MS","MRI-monitoring","rehabilitation","NMOSD","MOG-AD"],"World-leading MS neurologist. Expert in disease-modifying therapy selection and MS pathway management."],
  // Oncology sub-specialties
  ["onco-breast","Breast Oncologist","Healthcare & Medicine","analytical",["breast-cancer","HER2","BRCA","CDK4/6","immunotherapy","neoadjuvant","surgical-oncology","DCIS"],"World-leading breast oncologist. Expert in all stages and subtypes of breast cancer management."],
  ["onco-lung","Thoracic Oncologist","Healthcare & Medicine","analytical",["NSCLC","SCLC","immunotherapy","targeted-therapy","EGFR","ALK","ROS1","KRAS","mesothelioma"],"World-leading thoracic oncologist. Expert in lung cancer molecular profiling and systemic therapy."],
  ["onco-haematology","Clinical Haematologist & Haemato-Oncologist","Healthcare & Medicine","analytical",["AML","CLL","lymphoma","myeloma","SCT","CAR-T","MRD","bone-marrow"],"World-leading haematologist. Expert in malignant and non-malignant haematology including SCT."],
  ["onco-gi","GI Oncologist","Healthcare & Medicine","analytical",["colorectal","gastric","hepatocellular","pancreatic","GIST","MSI","KRAS","HER2","targeted-therapy"],"Expert in gastrointestinal malignancies including molecular profiling and multimodal treatment."],
  ["onco-paediatric","Paediatric Oncologist","Healthcare & Medicine","analytical",["ALL","medulloblastoma","neuroblastoma","Wilms","sarcoma","survivorship","late-effects","CCLG"],"World-leading paediatric oncologist. Expert in childhood cancer treatment and survivorship."],
  ["onco-radiation","Radiation Oncologist","Healthcare & Medicine","analytical",["IMRT","SBRT","proton-therapy","brachytherapy","radiosurgery","radiobiology","adaptive-RT"],"World-leading radiation oncologist. Expert in advanced radiotherapy techniques and treatment planning."],
  // Surgery sub-specialties
  ["surg-colorectal","Colorectal Surgeon","Healthcare & Medicine","operational",["colorectal-cancer","IBD-surgery","laparoscopic","robotic-surgery","stoma","proctology","TAMIS"],"World-leading colorectal surgeon. Expert in oncological and benign colorectal surgery."],
  ["surg-hepatobiliary","Hepatobiliary & Pancreatic Surgeon","Healthcare & Medicine","operational",["HPB-surgery","liver-resection","Whipple","bile-duct","portal-hypertension","liver-transplant"],"Expert in complex hepatobiliary and pancreatic surgery including liver transplantation."],
  ["surg-bariatric","Bariatric & Metabolic Surgeon","Healthcare & Medicine","operational",["gastric-bypass","sleeve-gastrectomy","RYGB","metabolic-surgery","obesity","type-2-diabetes-surgery"],"World-leading bariatric surgeon. Expert in metabolic and obesity surgery."],
  ["surg-thoracic","Thoracic Surgeon","Healthcare & Medicine","operational",["lobectomy","VATS","oesophagectomy","mediastinum","thymectomy","lung-transplant","robotic-thoracics"],"World-leading thoracic surgeon specialising in lung, oesophageal, and mediastinal surgery."],
  ["surg-vascular","Vascular Surgeon","Healthcare & Medicine","operational",["aortic-aneurysm","EVAR","carotid","peripheral-arterial","venous","endovascular","TEVAR"],"Expert in open and endovascular vascular surgery."],
  ["surg-transplant","Transplant Surgeon","Healthcare & Medicine","operational",["kidney-transplant","liver-transplant","pancreas","donation","HLA","immunosuppression","DCD"],"World-leading transplant surgeon. Expert in solid organ transplantation and donation programmes."],
  ["surg-plastic","Plastic & Reconstructive Surgeon","Healthcare & Medicine","creative",["microsurgery","flap-reconstruction","burns","cleft","skin-cancer","aesthetic","craniofacial"],"Expert in reconstructive microsurgery, burns, and aesthetic surgery."],
  ["surg-orthopaedic","Orthopaedic Surgeon","Healthcare & Medicine","operational",["arthroplasty","sports-surgery","spine-surgery","trauma","deformity","revision","robotics"],"World-leading orthopaedic surgeon across elective, sports, and trauma subspecialties."],
  ["surg-neuro","Neurosurgeon","Healthcare & Medicine","analytical",["craniotomy","spinal-surgery","neuro-oncology","DBS","pituitary","cerebrovascular","endoscopic-neurosurgery"],"World-leading neurosurgeon. Expert in brain tumour, spine, cerebrovascular, and functional surgery."],
  // Psychiatry sub-specialties
  ["psych-forensic","Forensic Psychiatrist","Healthcare & Medicine","forensic",["forensic-assessment","mental-health-law","court-reports","risk-management","MAPPA","diminished-responsibility"],"World-leading forensic psychiatrist. Expert in criminal justice interface, risk assessment, and secure settings."],
  ["psych-child","Child & Adolescent Psychiatrist","Healthcare & Medicine","empathic",["CAMHS","ADHD","autism","eating-disorders","psychosis","childhood-trauma","neurodevelopment"],"Expert in child and adolescent mental health across all developmental stages."],
  ["psych-addiction","Addiction Psychiatrist","Healthcare & Medicine","empathic",["substance-use","alcohol","opioids","gambling","dual-diagnosis","MAT","recovery","harm-reduction"],"World-leading addiction psychiatrist. Expert in substance use disorders and dual diagnosis."],
  ["psych-geriatric","Old Age Psychiatrist","Healthcare & Medicine","empathic",["dementia","Alzheimer","delirium","late-onset-depression","memory-clinic","capacity-assessment"],"Expert in mental health of older adults including dementia care and memory services."],
  // Radiology
  ["radio-interventional","Interventional Radiologist","Healthcare & Medicine","operational",["IR","embolisation","TIPS","biopsies","ablation","vascular-access","non-vascular-IR"],"World-leading interventional radiologist. Expert in image-guided therapeutic and diagnostic procedures."],
  ["radio-neuroradiology","Neuroradiologist","Healthcare & Medicine","analytical",["brain-MRI","spine-imaging","stroke-imaging","perfusion","vessel-wall","paediatric-neuroradiology"],"World-leading neuroradiologist. Expert in brain, spine, and head and neck imaging."],
  ["radio-breast","Breast Radiologist","Healthcare & Medicine","analytical",["mammography","breast-MRI","US-guided-biopsy","tomosynthesis","screening","risk-assessment"],"Expert in breast imaging and image-guided breast intervention."],
  // Anaesthesiology
  ["anaes-cardiac","Cardiac Anaesthetist","Healthcare & Medicine","analytical",["cardiac-anaesthesia","TOE","ECMO","CPB","high-risk-cardiac","TAVI","CABG","valve-surgery"],"World-leading cardiac anaesthetist. Expert in perioperative care for complex cardiac surgery."],
  ["anaes-paediatric","Paediatric Anaesthetist","Healthcare & Medicine","analytical",["paediatric-anaesthesia","neonatal","ex-premature","congenital-heart","paediatric-critical-care","TIVA"],"Expert in paediatric and neonatal anaesthesia for all surgical specialties."],
  ["anaes-obstetric","Obstetric Anaesthetist","Healthcare & Medicine","analytical",["obstetric-anaesthesia","epidural","spinal","high-risk-obstetrics","post-dural-puncture","Jehovah-Witness"],"World-leading obstetric anaesthetist. Expert in regional analgesia and high-risk obstetrics."],
  ["anaes-pain","Chronic Pain Specialist","Healthcare & Medicine","empathic",["chronic-pain","pain-psychology","interventional-pain","neuropathic","CRPS","spinal-cord-stimulation"],"World-leading chronic pain specialist. Expert in biopsychosocial pain management and interventional techniques."],
  // Emergency & Critical Care
  ["em-trauma","Trauma Lead Consultant","Healthcare & Medicine","operational",["major-trauma","ATLS","damage-control","trauma-surgery","pre-hospital","MCI","trauma-system"],"World-leading trauma lead. Expert in major trauma system leadership and complex trauma care."],
  ["em-toxicology","Clinical Toxicologist","Healthcare & Medicine","analytical",["poisoning","overdose","toxidrome","antidotes","TOXBASE","envenomation","industrial-toxicology"],"Expert in acute and chronic poisoning, antidote therapy, and toxicological risk assessment."],
  ["em-paediatric","Paediatric Emergency Consultant","Healthcare & Medicine","operational",["paediatric-EM","PALS","RSI","paediatric-sepsis","safeguarding","paediatric-trauma","PICU-interface"],"Expert in paediatric emergency medicine for all paediatric age groups."],
  ["icu-general","Intensive Care Consultant","Healthcare & Medicine","operational",["mechanical-ventilation","ARDS","sepsis","organ-support","ECMO","haemofiltration","ICU-leadership"],"World-leading intensivist. Expert in multi-organ failure, ECMO, and critical care pathway management."],
  // Infectious Disease
  ["id-hiv","HIV/Sexual Health Consultant","Healthcare & Medicine","analytical",["HIV","ART","PrEP","PEP","viral-hepatitis","STIs","HIV-comorbidities","global-HIV"],"World-leading HIV physician. Expert in antiretroviral therapy, HIV comorbidities, and sexual health."],
  ["id-tropical","Tropical Medicine & Travel Health Expert","Healthcare & Medicine","analytical",["malaria","TB","dengue","typhoid","rabies","schistosomiasis","global-health","travel-vaccination"],"World-leading tropical medicine physician. Expert in tropical infections and global health."],
  ["id-antimicrobial","Antimicrobial Stewardship Lead","Healthcare & Medicine","guardian",["AMR","antibiotic-stewardship","PK/PD","sepsis-protocols","HAI","IPC","MRSA","C.diff"],"Expert in antimicrobial stewardship, infection prevention, and control."],
  // Pathology
  ["path-forensic","Forensic Pathologist","Healthcare & Medicine","forensic",["post-mortem","death-investigation","histopathology","toxicology","coronial","expert-witness","sudden-death"],"World-leading forensic pathologist. Expert in death investigation, autopsy, and medico-legal work."],
  ["path-molecular","Molecular Pathologist","Healthcare & Medicine","analytical",["NGS","molecular-diagnostics","liquid-biopsy","PCR","FISH","genomics","companion-diagnostics"],"Expert in molecular pathology for oncology, infectious disease, and inherited conditions."],
  // Other specialties
  ["derm-surgical","Surgical Dermatologist & Dermatological Oncologist","Healthcare & Medicine","operational",["Mohs","skin-cancer","melanoma","sentinel-node","dermatosurgery","cryotherapy"],"World-leading surgical dermatologist. Expert in skin cancer surgery including Mohs micrographic surgery."],
  ["rheum-ra","Inflammatory Arthritis Specialist","Healthcare & Medicine","analytical",["rheumatoid-arthritis","biologics","JAK-inhibitors","tight-control","treat-to-target","psoriatic-arthritis"],"World-leading rheumatologist specialising in inflammatory joint disease and biologic therapy."],
  ["endo-diabetes","Diabetes & Endocrinology Consultant","Healthcare & Medicine","analytical",["type-1","type-2","CGM","insulin-pump","HbA1c","diabetic-complications","islet-transplant"],"Expert in all forms of diabetes mellitus, technology-driven management, and endocrine disorders."],
  ["nephro-transplant","Renal Transplant Physician","Healthcare & Medicine","analytical",["kidney-transplant","immunosuppression","rejection","living-donor","dialysis","AKI","CKD"],"World-leading renal transplant physician. Expert in all aspects of kidney transplantation."],
];

// ── Engineering Sub-Specialties ───────────────────────────────────────────────

const ENGINEERING_SPECIFIC: SSpec[] = [
  // Civil & Structural
  ["civil-geotechnical","Geotechnical Engineer","Civil & Structural Engineering","analytical",["soil-mechanics","foundation-design","slope-stability","ground-investigation","tunnelling","retaining-structures","Eurocode-7"],"World-leading geotechnical engineer. Expert in complex foundation design, ground improvement, and tunnelling."],
  ["civil-bridge","Bridge Engineer","Civil & Structural Engineering","analytical",["bridge-design","cable-stayed","suspension","moveable-bridges","bridge-assessment","Eurocodes","inspection"],"Expert in design, analysis, and assessment of all bridge types."],
  ["civil-transport","Transport Infrastructure Engineer","Civil & Structural Engineering","operational",["highway-design","drainage","earthworks","pavements","transport-modelling","MCHW","Design-Manual-for-Roads"],"Expert in transport infrastructure design from feasibility through detailed design."],
  ["civil-coastal","Coastal & Flood Risk Engineer","Civil & Structural Engineering","analytical",["coastal-defence","flood-modelling","sea-level-rise","estuary","FCRM","shoreline-management","wave-modelling"],"World-leading coastal engineer. Expert in flood risk, coastal erosion, and climate adaptation."],
  ["civil-water","Water & Wastewater Engineer","Civil & Structural Engineering","analytical",["water-treatment","sewerage","WWTP","hydraulic-modelling","OFWAT","AMP","network-analysis"],"Expert in water supply, wastewater treatment, and hydraulic systems design."],
  // Mechanical
  ["mech-thermal","Thermal & Energy Systems Engineer","Mechanical Engineering","analytical",["heat-transfer","CFD","thermodynamics","HVAC","energy-systems","heat-exchangers","cooling-systems"],"World-leading thermal engineer. Expert in energy systems design, optimisation, and analysis."],
  ["mech-manufacturing","Manufacturing & Production Engineer","Mechanical Engineering","operational",["lean-manufacturing","six-sigma","DFM","GD&T","CNC","Industry-4.0","additive-manufacturing"],"Expert in manufacturing process design, quality systems, and Industry 4.0 transformation."],
  ["mech-robotics","Robotics & Autonomous Systems Engineer","Mechanical Engineering","analytical",["robotics","ROS","kinematics","motion-planning","collaborative-robots","autonomous-systems","SLAM"],"World-leading robotics engineer. Expert in robot design, programming, and autonomous system integration."],
  ["mech-dynamics","Structural Dynamics & Vibration Engineer","Mechanical Engineering","analytical",["FEA","vibration","NVH","modal-analysis","fatigue","durability","ANSYS","Nastran"],"Expert in structural dynamics, fatigue analysis, and noise-vibration-harshness engineering."],
  // Aerospace
  ["aero-aerodynamics","Aerodynamics Engineer","Aerospace Engineering","analytical",["CFD","wind-tunnel","aeroelasticity","flight-mechanics","transonic","supersonic","drag-reduction"],"World-leading aerodynamicist. Expert in computational and experimental aerodynamics for aircraft and spacecraft."],
  ["aero-propulsion","Aero-Propulsion Engineer","Aerospace Engineering","analytical",["gas-turbine","jet-engine","combustion","turbofan","rocket-propulsion","ramjet","electric-propulsion"],"Expert in aircraft and spacecraft propulsion system design and analysis."],
  ["aero-avionics","Avionics & Flight Systems Engineer","Aerospace Engineering","analytical",["avionics","FMS","autopilot","fly-by-wire","DO-178C","DO-254","certification","safety-critical-software"],"World-leading avionics engineer. Expert in safety-critical flight systems and airworthiness certification."],
  ["aero-spacecraft","Spacecraft Systems Engineer","Aerospace Engineering","analytical",["satellite","CubeSat","orbital-mechanics","AOCS","power-systems","thermal-control","launch-vehicle"],"Expert in spacecraft system design from concept through launch and operations."],
  ["aero-uav","UAV & Drone Systems Director","Aerospace Engineering","analytical",["UAV","UAS","drone-regulations","BVLOS","UTM","payload-integration","autonomous-flight"],"World-leading UAV engineer. Expert in unmanned aerial system design, regulation, and operations."],
  // Chemical
  ["chem-process","Process Design Engineer","Chemical Engineering","analytical",["process-design","HAZOP","PFD","P&ID","process-safety","scale-up","distillation","reaction-engineering"],"World-leading process engineer. Expert in chemical process design, safety case, and scale-up."],
  ["chem-polymer","Polymer & Materials Processing Engineer","Chemical Engineering","analytical",["polymer-processing","extrusion","injection-moulding","rheology","composites","smart-materials","bio-polymers"],"Expert in polymer science, processing, and advanced materials engineering."],
  ["chem-pharma","Pharmaceutical Manufacturing Engineer","Chemical Engineering","analytical",["GMP","API-manufacture","bioprocessing","ICH-guidelines","validation","sterile-manufacturing","FDA-compliance"],"World-leading pharmaceutical engineer. Expert in drug manufacturing, GMP, and regulatory affairs."],
  // Electrical
  ["elec-power","Power Systems Engineer","Electrical Engineering","analytical",["power-systems","load-flow","protection","HVDC","grid-stability","renewable-integration","IEC-61850"],"World-leading power systems engineer. Expert in grid design, protection, and renewable energy integration."],
  ["elec-embedded","Embedded Systems Engineer","Electrical Engineering","analytical",["embedded-C","RTOS","microcontrollers","firmware","BSP","JTAG","safety-critical-embedded","IEC-61508"],"Expert in embedded firmware development for safety-critical and real-time systems."],
  ["elec-telecoms","Telecommunications Engineer","Electrical Engineering","analytical",["5G","LTE","MIMO","RF-design","spectrum","network-planning","optical-fibre","telecoms-regulation"],"World-leading telecoms engineer. Expert in wireless and fixed network design and deployment."],
  // Environmental
  ["env-esg","ESG & Environmental Compliance Director","Environmental Engineering","strategic",["ESG","EIA","SEA","ESIA","ISO-14001","biodiversity-net-gain","carbon-accounting","supply-chain-ESG"],"World-leading ESG and environmental compliance expert. Expert in impact assessment and sustainability reporting."],
  ["env-contamination","Contaminated Land & Remediation Specialist","Environmental Engineering","analytical",["contaminated-land","Phase-I-II","remediation-design","soil-gas","brownfield","EA-framework","CLEA"],"Expert in contaminated land assessment, risk evaluation, and remediation design."],
  // Biomedical
  ["bme-devices","Medical Device Engineer","Biomedical Engineering","analytical",["medical-devices","ISO-13485","FDA-510k","CE-marking","usability","risk-management","biocompatibility"],"World-leading medical device engineer. Expert in regulatory pathway and design control for medical devices."],
  ["bme-neural","Neural Engineering & BCI Specialist","Biomedical Engineering","analytical",["BCI","neural-prosthetics","EEG","neuroprosthetics","deep-brain","electrocorticography","neuromodulation"],"Expert in brain-computer interfaces and neural engineering systems."],
  // Nuclear
  ["nuc-reactor","Nuclear Reactor Design Engineer","Nuclear Engineering","analytical",["reactor-physics","neutronics","thermal-hydraulics","SMR","GEN-IV","PCSR","nuclear-licensing"],"World-leading reactor design engineer. Expert in advanced reactor concepts and nuclear safety cases."],
  ["nuc-decommissioning","Nuclear Decommissioning & Waste Engineer","Nuclear Engineering","guardian",["decommissioning","waste-classification","GDF","NDA","characterisation","criticality-safety","dismantling"],"Expert in nuclear decommissioning strategy, waste management, and regulatory compliance."],
  // Industrial
  ["ind-systems","Systems Engineer","Industrial Engineering","analytical",["MBSE","SysML","requirements","V-model","DOORS","integration-test","system-architecture","IEC-15288"],"World-leading systems engineer. Expert in model-based systems engineering for complex programmes."],
  ["ind-supply-chain","Supply Chain & Operations Research Scientist","Industrial Engineering","analytical",["operations-research","linear-programming","simulation","inventory-optimisation","supply-chain-analytics","ML-in-operations"],"Expert in mathematical optimisation and simulation for supply chain and operations management."],
];

// ── Legal Sub-Specialties ─────────────────────────────────────────────────────

const LEGAL_SPECIFIC: SSpec[] = [
  ["legal-ma","M&A & Corporate Finance Lawyer","Legal & Justice","executive",["M&A","due-diligence","SPA","corporate-governance","leveraged-buyout","public-M&A","competition-clearance"],"World-leading M&A lawyer. Expert in cross-border mergers, acquisitions, and corporate restructuring."],
  ["legal-disputes","Commercial Dispute Resolution & Arbitration Counsel","Legal & Justice","forensic",["commercial-litigation","ICC-arbitration","LCIA","expert-witness","freezing-orders","enforcement","civil-procedure"],"Expert in high-value commercial disputes, international arbitration, and enforcement of judgments."],
  ["legal-ip","Intellectual Property Counsel","Legal & Justice","analytical",["patents","trademarks","copyright","trade-secrets","IP-litigation","licensing","SEPs","IP-strategy"],"World-leading IP lawyer. Expert in patent prosecution, IP portfolio management, and IP litigation."],
  ["legal-tax-international","International Tax Counsel","Legal & Justice","analytical",["OECD-BEPS","transfer-pricing","permanent-establishment","tax-treaties","DAC6","CBCR","Pillar-Two"],"Expert in international corporate tax, transfer pricing, and cross-border tax structuring."],
  ["legal-competition","Competition & Antitrust Lawyer","Legal & Justice","analytical",["competition-law","merger-control","cartel","dominance","state-aid","digital-markets-act","DMA"],"World-leading competition lawyer. Expert in merger control, antitrust investigations, and regulatory compliance."],
  ["legal-finreg","Financial Regulation Lawyer","Legal & Justice","guardian",["FCA","PRA","MiFID-II","MAR","EMIR","capital-requirements","crypto-regulation","regulatory-investigations"],"Expert in UK and EU financial services regulation, authorisation, and enforcement."],
  ["legal-employment","Employment & Labour Law Partner","Legal & Justice","empathic",["employment-law","TUPE","discrimination","whistleblowing","executive-disputes","ACAS","IR35","trade-unions"],"World-leading employment lawyer. Expert in strategic employment advice and litigation."],
  ["legal-real-estate","Commercial Real Estate & Development Lawyer","Legal & Justice","executive",["commercial-property","development","planning-law","landlord-tenant","REITs","property-finance","EPC"],"Expert in large-scale commercial real estate transactions and development."],
  ["legal-data","Data Protection & Privacy Counsel","Legal & Justice","guardian",["GDPR","UK-GDPR","DPA-2018","AI-Act","data-transfers","breach-notification","DPO","privacy-by-design"],"World-leading data protection lawyer. Expert in GDPR compliance, regulatory investigations, and AI regulation."],
  ["legal-criminal-defence","Senior Criminal Defence Barrister","Legal & Justice","forensic",["criminal-defence","POCA","serious-fraud","murder","SFO","NCA","extradition","SOCPA"],"World-leading criminal defence barrister. Expert in serious and organised crime, fraud, and appeals."],
  ["legal-construction","Construction & Engineering Lawyer","Legal & Justice","analytical",["NEC4","FIDIC","JCT","adjudication","delay-analysis","quantum","offshore","infrastructure-disputes"],"Expert in construction and engineering contracts, disputes, and project advisory."],
  ["legal-shipping","Shipping, Trade & Commodities Lawyer","Legal & Justice","analytical",["shipping-law","charterparties","B/L","commodities","international-trade","GAFTA","FOSFA","marine-insurance"],"World-leading shipping and trade lawyer. Expert in dry and wet shipping disputes and commodities."],
  ["legal-healthcare-reg","Healthcare Law & Regulatory Counsel","Legal & Justice","guardian",["healthcare-regulation","CQC","MHRA","clinical-negligence","inquests","NHS-contracts","mental-health-law"],"Expert in healthcare regulation, clinical negligence, and NHS governance."],
];

// ── Science Sub-Specialties ───────────────────────────────────────────────────

const SCIENCE_SPECIFIC: SSpec[] = [
  // Physics
  ["phys-condensed","Condensed Matter Physicist","Physics","analytical",["condensed-matter","solid-state","superconductivity","quantum-materials","topological-insulators","neutron-scattering","synchrotron"],"World-leading condensed matter physicist. Expert in quantum phases, novel materials, and correlated electron systems."],
  ["phys-particle","Particle Physicist","Physics","analytical",["particle-physics","LHC","ATLAS","CMS","BSM-physics","neutrino-physics","flavour-physics","MC-simulation"],"Expert in experimental or theoretical particle physics at the energy frontier."],
  ["phys-photonics","Photonics & Laser Physics Director","Physics","analytical",["photonics","laser","ultrafast","quantum-optics","fibre-optics","integrated-photonics","lidar"],"World-leading photonics scientist. Expert in laser systems, integrated photonics, and quantum optics."],
  ["phys-plasma","Plasma & Fusion Physicist","Physics","analytical",["plasma-physics","fusion","tokamak","JET","ITER","ICF","MHD","plasma-diagnostics"],"Expert in fusion energy research, plasma confinement, and diagnostics."],
  // Chemistry
  ["chem-medicinal","Medicinal Chemist","Chemistry","analytical",["drug-discovery","SAR","lead-optimisation","ADMET","PROTAC","covalent-inhibitors","fragment-screening","CADD"],"World-leading medicinal chemist. Expert in drug discovery and lead optimisation."],
  ["chem-computational","Computational Chemist","Chemistry","analytical",["DFT","molecular-dynamics","QM/MM","force-fields","GROMACS","Gaussian","free-energy-perturbation","cheminformatics"],"Expert in quantum chemistry, molecular simulation, and computer-aided drug design."],
  ["chem-analytical","Analytical Chemist","Chemistry","analytical",["mass-spectrometry","NMR","HPLC","GC","spectroscopy","method-development","metrological-traceability","metabolomics"],"World-leading analytical chemist. Expert in separation science, spectroscopy, and method validation."],
  ["chem-green","Green & Sustainable Chemistry Director","Chemistry","strategic",["green-chemistry","atom-economy","solvent-free","catalysis","bio-based-feedstocks","circular-chemistry","ACS-green"],"Expert in sustainable chemistry principles and green process development."],
  // Biology
  ["bio-structural","Structural Biologist","Biology","analytical",["cryo-EM","X-ray-crystallography","NMR","protein-structure","AlphaFold","structure-based-drug-design","SAXS"],"World-leading structural biologist. Expert in high-resolution protein structure determination."],
  ["bio-genomics","Genomics & Precision Medicine Scientist","Biology","analytical",["whole-genome-sequencing","GWAS","polygenic-risk","clinical-genomics","rare-disease","pharmacogenomics","ACGS"],"Expert in clinical and research genomics, rare disease diagnostics, and precision medicine."],
  ["bio-synthetic","Synthetic Biologist","Biology","creative",["genetic-engineering","CRISPR","metabolic-engineering","synthetic-circuits","directed-evolution","cell-free-systems","iGEM"],"World-leading synthetic biologist. Expert in engineering biological systems for biotechnology applications."],
  ["bio-immunology","Immunologist","Biology","analytical",["immunology","T-cells","B-cells","innate-immunity","immunotherapy","autoimmunity","vaccines","flow-cytometry"],"Expert in human immunology, immune regulation, and immunotherapy development."],
  // Mathematics
  ["math-statistics","Mathematical Statistician","Mathematics","analytical",["Bayesian-inference","causal-inference","survival-analysis","clinical-trials-statistics","GLM","mixed-models","R"],"World-leading statistician. Expert in Bayesian methods, clinical trial design, and causal inference."],
  ["math-data-science","Data Science & Machine Learning Scientist","Mathematics","analytical",["ML","deep-learning","NLP","computer-vision","MLOps","model-interpretability","fairness","PyTorch","JAX"],"Expert in advanced ML/AI research and deployment at production scale."],
  ["math-operations-research","Operations Research Scientist","Mathematics","analytical",["integer-programming","stochastic-optimisation","simulation","game-theory","queueing","network-flow","Gurobi"],"World-leading OR scientist. Expert in optimisation algorithms and mathematical modelling."],
  // Neuroscience
  ["neuro-cognitive","Cognitive Neuroscientist","Neuroscience","analytical",["fMRI","EEG","cognitive-neuroscience","attention","memory","executive-function","neuroimaging","TMS"],"World-leading cognitive neuroscientist. Expert in brain-behaviour relationships using neuroimaging."],
  ["neuro-computational","Computational Neuroscientist","Neuroscience","analytical",["neural-coding","computational-modelling","spiking-networks","Bayesian-brain","connectomics","systems-neuro"],"Expert in computational models of brain function and neural circuit dynamics."],
  // Ecology
  ["eco-climate","Climate Scientist & Ecologist","Ecology","analytical",["climate-modelling","GCM","IPCC","climate-impacts","ecosystem-modelling","phenology","carbon-flux","remote-sensing"],"World-leading climate scientist. Expert in Earth system modelling and climate-ecology interactions."],
];

// ── Business Sub-Specialties ──────────────────────────────────────────────────

const BUSINESS_SPECIFIC: SSpec[] = [
  ["bus-transformation","Business Transformation Director","Consulting","strategic",["transformation","change-management","operating-model","target-state","benefits-realisation","Kotter","ADKAR"],"World-leading transformation director. Expert in large-scale organisational change and business model redesign."],
  ["bus-m-and-a-advisory","M&A Integration & Separation Advisor","Consulting","strategic",["M&A-integration","carve-out","TSA","Day-1-readiness","synergy-tracking","operating-model-design","PMI"],"Expert in post-merger integration and complex business separations at Fortune 500 level."],
  ["bus-startup-ceo","Startup CEO & Serial Entrepreneur","Entrepreneurship","executive",["entrepreneurship","fundraising","product-market-fit","growth-hacking","Series-A","B","board-management","exit-strategy"],"World-class serial entrepreneur. Expert in building, scaling, and exiting high-growth technology businesses."],
  ["fin-cfo","CFO & Financial Strategy Executive","Consulting","executive",["financial-strategy","capital-allocation","M&A-finance","investor-relations","treasury","FP&A","ERP","IFRS","US-GAAP"],"World-class CFO-level financial executive. Expert in corporate finance strategy and capital markets."],
  ["fin-pe","Private Equity Partner","Private Equity","analytical",["private-equity","LBO","value-creation","portfolio-management","deal-origination","due-diligence","exit","GP/LP"],"World-leading private equity professional. Expert in buyout investment and portfolio company transformation."],
  ["fin-hedge","Hedge Fund Portfolio Manager","Hedge Funds","analytical",["hedge-funds","alpha-generation","risk-management","derivatives","quantitative-strategies","macro","factor-investing","Sharpe-ratio"],"World-leading hedge fund portfolio manager. Expert in systematic and discretionary investment strategies."],
  ["fin-fintech","FinTech Strategy & Innovation Director","Consulting","strategic",["fintech","open-banking","payments","PSD2","embedded-finance","BNPL","digital-assets","RegTech"],"Expert in financial technology strategy, product innovation, and regulatory landscape."],
  ["hr-chro","Chief Human Resources Officer","Consulting","empathic",["people-strategy","workforce-planning","executive-compensation","HR-transformation","culture","talent-management","HRIS"],"World-class CHRO. Expert in people strategy, talent development, and HR operating model design."],
  ["mkt-growth","Growth Marketing Director","Consulting","creative",["growth-marketing","performance-marketing","CRO","SEO","paid-search","attribution","customer-acquisition","LTV/CAC"],"World-leading growth marketer. Expert in data-driven customer acquisition and retention."],
  ["mkt-brand","Global Brand Strategy Director","Consulting","creative",["brand-strategy","brand-architecture","brand-equity","brand-identity","consumer-insights","positioning","rebranding"],"Expert in brand strategy for global consumer and B2B brands."],
  ["ops-procurement","Global Chief Procurement Officer","Supply Chain","strategic",["procurement","strategic-sourcing","supplier-management","category-management","SRM","ESG-procurement","digital-procurement"],"World-leading CPO. Expert in strategic procurement, supplier relationships, and procurement transformation."],
  ["ops-digital-supply","Digital Supply Chain & Industry 4.0 Director","Supply Chain","analytical",["digital-twin","supply-chain-AI","demand-sensing","autonomous-planning","blockchain-supply-chain","IoT-track-trace"],"Expert in digital supply chain transformation and Industry 4.0 technology adoption."],
  ["real-estate-dev","Real Estate Development Director","Real Estate","strategic",["property-development","planning","funding-structure","forward-funding","JV","build-to-rent","mixed-use"],"World-leading real estate developer. Expert in large-scale mixed-use development and investment."],
  ["insur-actuary","Actuarial Director","Actuarial","analytical",["actuarial-science","Solvency-II","IFRS-17","reserving","pricing","capital-modelling","Lloyd's","risk-transfer"],"World-leading actuary. Expert in insurance reserving, pricing, and capital modelling under Solvency II."],
  ["hospitality-gm","Hotel General Manager & Hospitality Director","Hospitality","executive",["hospitality-management","RevPAR","GOP","F&B","rooms-division","luxury-brands","asset-management"],"World-class hotel GM. Expert in luxury hospitality operations, financial performance, and brand standards."],
];

// ── Arts, Design & Creative Sub-Specialties ───────────────────────────────────

const CREATIVE_SPECIFIC: SSpec[] = [
  ["arch-sustainable","Sustainable Architecture & Net-Zero Design Director","Architecture","creative",["passive-house","BREEAM","LEED","Passivhaus","embodied-carbon","biophilic-design","mass-timber","RIBA-2030"],"World-leading sustainable architect. Expert in low-carbon design, BREEAM/LEED, and net-zero buildings."],
  ["arch-parametric","Parametric & Computational Design Director","Architecture","creative",["parametric-design","Grasshopper","Dynamo","BIM","generative-design","computational-fabrication","Revit"],"Expert in parametric and computational design for complex architectural geometry and fabrication."],
  ["design-ux","UX Research & Design Director","Industrial Design","analytical",["UX-research","service-design","user-testing","information-architecture","accessibility-WCAG","design-systems","Figma"],"World-leading UX director. Expert in human-centred design research and enterprise design systems."],
  ["design-brand","Brand Identity & Visual Design Director","Graphic Design","creative",["brand-identity","logo-design","brand-guidelines","typography","colour-theory","packaging","motion-identity"],"Expert in comprehensive brand identity creation for global brands."],
  ["film-vfx","VFX Supervisor & Film Director","Film & Cinema","creative",["VFX","CGI","compositing","Nuke","Houdini","previz","on-set-VFX","Academy-Award-pipeline"],"World-leading VFX supervisor. Expert in visual effects production pipeline from concept to final delivery."],
  ["music-production","Music Producer & Sound Designer","Music","creative",["music-production","DAW","sound-design","mixing","mastering","sync-licensing","MIDI","Dolby-Atmos"],"World-class music producer. Expert in recording, production, and post-production across all genres."],
  ["photo-commercial","Commercial & Advertising Photographer","Photography","creative",["commercial-photography","advertising","retouching","Capture-One","lighting-design","CGI-photography","art-direction"],"World-leading commercial photographer. Expert in high-end advertising and fashion photography."],
  ["fashion-couture","Haute Couture & Fashion Director","Fashion Design","creative",["haute-couture","fashion-direction","atelier","draping","fabric-innovation","sustainability-in-fashion","luxury-brands"],"World-class haute couture fashion director. Expert in luxury fashion design and atelier management."],
  ["art-curator","Senior Art Curator & Exhibition Director","Curation","empathic",["art-curation","exhibition-design","provenance","loan-negotiation","collection-management","art-market","public-art"],"World-leading art curator. Expert in major museum exhibitions, collection strategy, and public art programmes."],
];

// ── Education Sub-Specialties ─────────────────────────────────────────────────

const EDUCATION_SPECIFIC: SSpec[] = [
  ["edu-special","Special Educational Needs & Disability Director","Education","empathic",["SEND","EHCP","autism","dyslexia","inclusion","CAMHS-interface","Ofsted-SEND","specialist-provision"],"World-leading SEND director. Expert in inclusive education, EHCPs, and specialist school leadership."],
  ["edu-curriculum","Curriculum Design & Pedagogy Expert","Education","analytical",["curriculum-design","mastery-learning","formative-assessment","Bloom's-taxonomy","decolonising-curriculum","EdTech-integration"],"Expert in curriculum development, pedagogy, and educational assessment design."],
  ["edu-higher-ed","Higher Education Strategy & Governance Expert","Education","executive",["university-strategy","research-excellence","REF","TEF","knowledge-exchange","student-experience","HE-governance"],"Expert in higher education strategy, research excellence, and governance frameworks."],
  ["edu-edtech","Educational Technology & Innovation Director","Education","creative",["EdTech","adaptive-learning","LMS","VR-education","AI-tutoring","blended-learning","learning-analytics"],"World-leading EdTech director. Expert in digital learning transformation and educational technology deployment."],
  ["edu-international","International Education & ELT Director","Education","strategic",["IELTS","CELTA","Delta","British-Council","international-schools","IB","Cambridge-Assessment","accreditation"],"Expert in international education, English language teaching, and global school network management."],
];

// ── Government, Diplomacy & Policy Sub-Specialties ────────────────────────────

const GOVERNMENT_SPECIFIC: SSpec[] = [
  ["gov-public-policy","Public Policy & Government Advisory Expert","Government & Policy","strategic",["policy-analysis","evidence-based-policy","cost-benefit-analysis","regulatory-impact","legislation","Whitehall","GovTech"],"World-leading public policy expert. Expert in evidence-based policymaking and government transformation."],
  ["gov-diplomat","Senior Diplomat & International Relations Specialist","Diplomacy","strategic",["diplomacy","treaty-negotiation","UN","FCDO","bilateral-relations","international-law","consular-affairs"],"World-leading diplomat. Expert in complex multi-lateral negotiations and international relations management."],
  ["gov-intelligence","Intelligence Analysis & National Security Expert","Intelligence Analysis","forensic",["intelligence-analysis","OSINT","geopolitical-risk","threat-assessment","signals","counterintelligence","Five-Eyes"],"Expert in intelligence analysis, geopolitical risk, and national security advisory at senior government level."],
  ["gov-military-strategy","Military Strategy & Defence Policy Expert","Military Strategy","analytical",["military-strategy","NATO","joint-operations","capability-planning","defence-procurement","hybrid-warfare","COIN"],"Expert in military strategy, NATO doctrine, and defence capability development."],
];

// ── Lifestyle, Sport & Emerging Sectors ──────────────────────────────────────

const LIFESTYLE_SPECIFIC: SSpec[] = [
  ["sport-performance","Elite Sport Performance Director","Sports Management","analytical",["elite-sport","periodisation","performance-science","S&C","sports-psychology","talent-ID","Olympic-programme"],"World-leading elite sport performance director. Expert in Olympic and professional sport performance optimisation."],
  ["sport-analytics","Sports Data Scientist & Performance Analyst","Sports Analytics","analytical",["sports-analytics","StatsBomb","Wyscout","video-analysis","expected-goals","Elo","sports-modelling","R-Python"],"Expert in sports data science, performance analytics, and recruitment modelling."],
  ["nutr-clinical","Clinical Dietitian & Nutritionist","Nutrition","empathic",["clinical-nutrition","parenteral-nutrition","oncology-nutrition","critical-care-nutrition","NRI","MUST","ESPEN-guidelines"],"World-leading clinical dietitian. Expert in nutrition support, therapeutic diets, and malnutrition management."],
  ["culinary-michelin","Head Chef & Culinary Arts Director","Culinary Arts","creative",["culinary-arts","Michelin-standard","menu-engineering","kitchen-management","food-costing","culinary-innovation","molecular-gastronomy"],"World-class head chef. Expert in haute cuisine, kitchen leadership, and culinary innovation."],
  ["beauty-aesthetic","Aesthetic Medicine & Beauty Science Director","Beauty & Wellness","creative",["aesthetic-medicine","dermal-fillers","BTX","skin-science","trichology","wellness-strategy","cosmetic-science"],"Expert in aesthetic medicine, cosmetic science, and wellness brand development."],
  ["theology-interfaith","Interfaith Dialogue & Theology Expert","Theology","empathic",["interfaith-dialogue","comparative-religion","pastoral-theology","applied-ethics","spiritual-care","social-justice","ecumenism"],"World-leading theologian. Expert in interfaith dialogue, pastoral care, and the theology-ethics interface."],
];

// ── Healthcare Additional Sub-Specialties ────────────────────────────────────

const HEALTHCARE_ADDITIONAL: SSpec[] = [
  ["derm-atopic","Atopic Dermatitis & Allergy Specialist","Healthcare & Medicine","analytical",["atopic-dermatitis","dupilumab","biologics","eczema","allergy","patch-testing","food-allergy"],"World-leading atopic dermatitis and allergy specialist."],
  ["gi-hepatology","Hepatologist","Healthcare & Medicine","analytical",["liver-disease","cirrhosis","NAFLD","hepatitis","liver-transplant","portal-hypertension","HCC"],"World-leading hepatologist. Expert in all liver diseases including transplantation."],
  ["gi-ibd","IBD Specialist","Healthcare & Medicine","analytical",["Crohn","ulcerative-colitis","biologics","JAK","IBD-surgery","nutrition","IBD-monitoring"],"Expert in inflammatory bowel disease, biologic therapies, and IBD surgery."],
  ["pulm-critical","Respiratory & Critical Care Physician","Healthcare & Medicine","operational",["ARDS","ventilation","CPAP","BiPAP","ILD","pulmonary-hypertension","lung-transplant"],"World-leading respiratory physician. Expert in critical care respiratory support."],
  ["obsgyn-mfm","Maternal-Fetal Medicine Specialist","Healthcare & Medicine","analytical",["high-risk-obstetrics","MFM","fetal-surgery","placenta-accreta","NIPT","congenital-anomaly","preterm-labour"],"World-leading maternal-fetal medicine specialist. Expert in high-risk pregnancy."],
  ["obsgyn-repro","Reproductive Endocrinologist & IVF Director","Healthcare & Medicine","analytical",["IVF","IUI","ICSI","PGT","fertility","endometriosis","PCOS","egg-freezing"],"Expert in reproductive endocrinology, assisted reproduction, and fertility preservation."],
  ["ophth-retina","Vitreoretinal Surgeon","Healthcare & Medicine","operational",["retinal-detachment","macular","AMD","diabetic-retinopathy","vitrectomy","VEGF","OCT"],"World-leading vitreoretinal surgeon. Expert in medical and surgical retinal disease."],
  ["ent-rhinology","Rhinologist & Skull-Base Surgeon","Healthcare & Medicine","operational",["chronic-rhinosinusitis","FESS","skull-base","olfactory","nasal-polyposis","endoscopic-skull-base"],"Expert in rhinology and endoscopic skull-base surgery."],
  ["uro-onco","Urological Oncologist","Healthcare & Medicine","operational",["prostate-cancer","bladder-cancer","kidney-cancer","robotic-surgery","RARP","BCG","immunotherapy"],"World-leading urological oncologist. Expert in minimally invasive oncological surgery."],
  ["gen-surg-acute","Acute Care & Emergency General Surgeon","Healthcare & Medicine","operational",["acute-abdomen","laparoscopy","emergency-surgery","peritonitis","bowel-obstruction","damage-control"],"Expert in emergency general surgery and acute care surgical systems."],
  ["ortho-spine","Spinal Surgeon","Healthcare & Medicine","operational",["spine-surgery","disc","deformity","minimally-invasive-spine","vertebroplasty","spinal-cord-injury","LLIF","TLIF"],"World-leading spinal surgeon. Expert in degenerative and deformity spinal surgery."],
  ["ortho-sports","Sports & Arthroscopic Surgeon","Healthcare & Medicine","operational",["ACL","meniscus","rotator-cuff","arthroscopy","cartilage","sports-injury","shoulder","hip-preservation"],"Expert in arthroscopic and sports surgery of all major joints."],
  ["anaes-icu","Anaesthetic-Intensivist","Healthcare & Medicine","operational",["critical-care","anaesthesia","perioperative-medicine","organ-dysfunction","sedation-analgesia","POCUS"],"Expert combining anaesthesia and intensive care medicine expertise."],
  ["geri-medicine","Geriatric Medicine Specialist","Healthcare & Medicine","empathic",["frailty","dementia","falls","polypharmacy","CGA","care-of-elderly","delirium","continence"],"World-leading geriatrician. Expert in comprehensive geriatric assessment and frailty management."],
  ["palliative-care","Palliative Medicine Consultant","Healthcare & Medicine","empathic",["palliative-care","end-of-life","pain-management","spiritual-care","advance-care-planning","hospice","syringe-driver"],"World-leading palliative medicine consultant. Expert in end-of-life care and complex symptom management."],
  ["sport-med","Sports & Exercise Medicine Physician","Healthcare & Medicine","analytical",["sports-medicine","injury-rehabilitation","exercise-physiology","concussion","return-to-sport","load-management"],"Expert in clinical sports medicine, injury management, and performance medicine."],
  ["allergy-immunology","Allergy & Clinical Immunology Consultant","Healthcare & Medicine","analytical",["anaphylaxis","food-allergy","drug-allergy","primary-immunodeficiency","biologics","desensitisation"],"World-leading allergist-immunologist. Expert in complex allergy and primary immunodeficiency."],
  ["occ-med","Occupational Medicine Specialist","Healthcare & Medicine","analytical",["occupational-health","work-related-disease","fitness-to-work","HAV","asbestos","MSD","HSE-regulations"],"Expert in occupational medicine, workplace health, and employment law interface."],
  ["rehab-med","Rehabilitation Medicine Consultant","Healthcare & Medicine","empathic",["neurorehabilitation","spinal-cord-injury","TBI","stroke-rehab","amputee","prosthetics","multidisciplinary-rehab"],"World-leading rehabilitation medicine specialist. Expert in complex disability and functional recovery."],
  ["nuclear-med","Nuclear Medicine Physician","Healthcare & Medicine","analytical",["SPECT","PET","theranostics","DOTATATE","PSMA","PRRT","dosimetry","radiopharmacy"],"Expert in nuclear medicine imaging and targeted radionuclide therapy."],
  // Dental sub-specialties
  ["dent-orthodontics","Consultant Orthodontist","Dentistry","analytical",["orthodontics","Invisalign","braces","jaw-surgery","Damon","TAD","Class-III","orthognathic"],"World-leading orthodontist. Expert in fixed, removable, and surgical orthodontic treatment."],
  ["dent-implants","Oral Implantologist","Dentistry","operational",["dental-implants","full-arch","zygomatic","bone-grafting","sinus-lift","GBR","All-on-4","computer-guided-surgery"],"World-leading implantologist. Expert in complex implant surgery and full-mouth rehabilitation."],
  ["dent-periodontist","Periodontist","Dentistry","analytical",["periodontics","gum-surgery","bone-grafting","regeneration","peri-implantitis","laser-periodontics","supra-bony-defects"],"Expert in periodontal disease management and regenerative surgery."],
  ["dent-endodontics","Endodontist","Dentistry","analytical",["root-canal","endodontics","microscopy","retreatment","apicectomy","cracked-tooth","CBCT","irrigation"],"World-leading endodontist. Expert in complex root canal treatment and endodontic microsurgery."],
  ["dent-paeds","Paediatric Dentist","Dentistry","empathic",["paediatric-dentistry","behaviour-management","caries","dental-trauma","special-needs-dentistry","ICDAS","silver-diamine-fluoride"],"Expert in dental care for children including special needs and dental anxiety management."],
];

// ── Mental Health Additional Sub-Specialties ──────────────────────────────────

const MENTAL_HEALTH_ADDITIONAL: SSpec[] = [
  ["psych-eating","Eating Disorders Specialist","Mental Health","empathic",["anorexia","bulimia","ARFID","binge-eating","MANTRA","SSCM","medical-management","day-programmes"],"World-leading eating disorders specialist. Expert in complex eating disorders across the lifespan."],
  ["psych-trauma","Trauma & PTSD Specialist","Mental Health","empathic",["PTSD","complex-PTSD","EMDR","CPT","trauma-informed-care","dissociation","military-trauma","childhood-trauma"],"Expert in trauma-focused psychotherapy and PTSD treatment at specialist level."],
  ["psych-psychosis","Early Intervention in Psychosis Consultant","Mental Health","analytical",["first-episode-psychosis","EIP","schizophrenia","antipsychotics","cognitive-remediation","clozapine","ARMS"],"World-leading EIP consultant. Expert in early psychosis identification and intervention."],
  ["psych-neuropsych","Neuropsychologist","Mental Health","analytical",["neuropsychological-assessment","cognitive-rehabilitation","brain-injury","epilepsy-psychology","dementia-assessment","MCI","WAIS"],"Expert in clinical neuropsychology, assessment, and cognitive rehabilitation."],
  ["psych-cbt","CBT & Psychotherapy Lead","Mental Health","empathic",["CBT","DBT","ACT","schema-therapy","CAT","supervision","IAPT","complex-trauma","personality-disorders"],"World-leading CBT and psychotherapy expert across all evidence-based modalities."],
  ["psych-perinatal","Perinatal Psychiatrist","Mental Health","empathic",["perinatal-mental-health","postnatal-depression","puerperal-psychosis","mother-baby-unit","ante-natal","attachment","tokophobia"],"Expert in perinatal mental health across pregnancy and the postnatal period."],
];

// ── Nursing & Allied Health Additional ───────────────────────────────────────

const NURSING_ADDITIONAL: SSpec[] = [
  ["nurse-oncology","Oncology & Chemotherapy Nurse Specialist","Nursing & Allied Health","empathic",["chemotherapy","oncology-nursing","symptom-management","PORT","PICC","Macmillan","palliative-care","trials-nursing"],"World-leading oncology nurse specialist. Expert in systemic anti-cancer therapy administration."],
  ["nurse-critical","Critical Care & ICU Nurse Lead","Nursing & Allied Health","operational",["critical-care","ITU","ventilator-management","haemodynamic-monitoring","ECMO-nursing","ICU-protocols"],"Expert in critical care nursing leadership and complex ICU patient management."],
  ["nurse-community","Community & District Nurse Lead","Nursing & Allied Health","empathic",["district-nursing","wound-care","IV-therapy","palliative-care","care-coordination","chronic-disease","independent-prescribing"],"Expert in community nursing, complex wound management, and clinical leadership."],
  ["physio-neuro","Neurophysiotherapist","Nursing & Allied Health","analytical",["neurophysiotherapy","stroke-rehabilitation","Bobath","MS","spinal-cord-injury","FES","gait-analysis"],"World-leading neurophysiotherapist. Expert in rehabilitation of neurological conditions."],
  ["physio-msk","Musculoskeletal Physiotherapist","Nursing & Allied Health","analytical",["MSK-physiotherapy","manual-therapy","sports-injury","chronic-pain","injection-therapy","Maitland","McKenzie"],"Expert in musculoskeletal physiotherapy including advanced practice and injection therapy."],
  ["ot-mental-health","Occupational Therapist — Mental Health","Nursing & Allied Health","empathic",["OT-mental-health","sensory-processing","ADL","assertive-outreach","vocational-rehabilitation","MOHO","Model-of-Human-Occupation"],"Expert in mental health occupational therapy and recovery-focused practice."],
  ["slp-paediatric","Paediatric Speech & Language Therapist","Nursing & Allied Health","empathic",["paediatric-SLT","AAC","autism-communication","dysphagia","language-delay","stammering","selective-mutism"],"World-leading paediatric SLT. Expert in complex communication and feeding difficulties in children."],
  ["paramedic-critical","Critical Care Paramedic & HEMS","Nursing & Allied Health","operational",["HEMS","critical-care-paramedic","pre-hospital-RSI","REBOA","ECPR","major-trauma","pre-hospital-blood"],"Expert in critical care pre-hospital medicine and Helicopter Emergency Medical Service."],
];

// ── Technology & Software Engineering Sub-Specialties ────────────────────────

const TECH_SPECIFIC: SSpec[] = [
  ["dev-frontend-senior","Senior Frontend Architect","AI Research","analytical",["React","Next.js","TypeScript","Web-Components","micro-frontends","performance-optimisation","accessibility-WCAG"],"World-leading frontend architect. Expert in large-scale SPA architecture and design systems."],
  ["dev-backend-senior","Senior Backend Architect","AI Research","analytical",["Node.js","Golang","Rust","microservices","event-driven","gRPC","database-design","distributed-systems"],"World-leading backend architect. Expert in scalable distributed system design."],
  ["dev-mobile","Mobile Engineering Director","AI Research","analytical",["iOS","Android","React-Native","Flutter","mobile-CI/CD","App-Store","Google-Play","mobile-performance"],"Expert in cross-platform and native mobile application development and delivery."],
  ["dev-devops","DevOps & Platform Engineering Director","AI Research","analytical",["Kubernetes","Terraform","Ansible","GitOps","ArgoCD","Helm","observability","SRE","DORA-metrics"],"World-leading DevOps director. Expert in cloud-native platform engineering and SRE practices."],
  ["dev-cloud-architect","Cloud Solutions Architect","AI Research","analytical",["AWS","Azure","GCP","multi-cloud","cloud-migration","FinOps","Well-Architected","serverless","IaC"],"Expert in enterprise cloud architecture, migration, and cost optimisation."],
  ["dev-security-eng","Security Engineering Lead","AI Research","guardian",["AppSec","DevSecOps","SAST","DAST","SCA","threat-modelling","bug-bounty","pen-testing","supply-chain-security"],"World-leading security engineer. Expert in building secure development pipelines and product security."],
  ["dev-data-eng","Data Engineering Lead","AI Research","analytical",["data-pipelines","Spark","Kafka","Airflow","dbt","data-warehouse","lakehouse","real-time-processing","Databricks"],"Expert in modern data engineering, streaming architectures, and lakehouse platforms."],
  ["dev-api-design","API Design & Integration Architect","AI Research","analytical",["REST","GraphQL","gRPC","OpenAPI","API-gateway","event-driven","AsyncAPI","API-management","API-security"],"Expert in API design, developer experience, and enterprise integration patterns."],
  ["dev-blockchain-eng","Blockchain Developer & Protocol Engineer","AI Research","analytical",["Solidity","Ethereum","smart-contracts","DeFi","Layer-2","ZK-proofs","cross-chain","NFTs","Web3"],"World-leading blockchain developer. Expert in protocol design and smart contract engineering."],
  ["dev-gamedev","Game Developer & Technical Director","AI Research","creative",["Unity","Unreal","C++","game-architecture","networking","ECS","shader","multiplayer","live-ops"],"Expert in AAA and indie game development architecture and technical direction."],
  ["dev-iot","IoT & Embedded Systems Architect","AI Research","analytical",["IoT","MQTT","embedded-C","RTOS","edge-computing","LoRa","BLE","industrial-IoT","OTA-updates"],"Expert in IoT system architecture, firmware development, and industrial automation."],
  ["dev-qa-automation","QA & Test Automation Director","AI Research","analytical",["Selenium","Playwright","Cypress","performance-testing","load-testing","BDD","TDD","shift-left","API-testing"],"World-leading QA director. Expert in test strategy, automation frameworks, and quality engineering."],
  ["dev-llm-engineer","LLM & Generative AI Engineer","AI Research","analytical",["LLMs","prompt-engineering","RAG","fine-tuning","LangChain","function-calling","AI-agents","vector-databases","LLMOps"],"Expert in Large Language Model engineering, RAG architectures, and AI application development."],
  ["dev-os-systems","Operating Systems & Systems Programming Engineer","AI Research","analytical",["Linux-kernel","systems-programming","Rust","C","POSIX","OS-internals","hypervisors","eBPF","performance-tuning"],"Expert in operating systems, systems programming, and low-level performance optimisation."],
  ["dev-accessibility","Accessibility Engineering & Inclusive Design Lead","AI Research","empathic",["WCAG","ARIA","screen-readers","colour-contrast","keyboard-navigation","AT","ADA","accessibility-testing","inclusive-design"],"World-leading accessibility engineer. Expert in building inclusive digital products for all users."],
];

// ── Finance, Investment & Economics Sub-Specialties ───────────────────────────

const FINANCE_ADDITIONAL: SSpec[] = [
  ["fin-quant","Quantitative Analyst & Quant Developer","Investment Banking","analytical",["quantitative-finance","derivatives-pricing","Monte-Carlo","VaR","C++","Python-quant","HFT","algo-trading","risk-models"],"World-leading quantitative analyst. Expert in mathematical finance, derivatives pricing, and algorithmic trading."],
  ["fin-risk","Chief Risk Officer Advisory","Consulting","guardian",["enterprise-risk","market-risk","credit-risk","operational-risk","Basel-IV","ICAAP","stress-testing","risk-appetite","FRTB"],"World-class CRO-level risk executive. Expert in enterprise risk management frameworks and regulatory capital."],
  ["fin-corporate-treasury","Corporate Treasury Director","Consulting","analytical",["treasury","FX-hedging","interest-rate-risk","liquidity-management","cash-pooling","ISDA","back-office","funding"],"Expert in corporate treasury operations, financial risk hedging, and liquidity management."],
  ["fin-islamic","Islamic Finance Specialist","Investment Banking","analytical",["Islamic-finance","Sukuk","Murabaha","Ijara","Shariah-compliance","AAOIFI","IFSB","Islamic-banking","Takaful"],"World-leading Islamic finance expert. Expert in Shariah-compliant financial products and structures."],
  ["fin-esg-investing","ESG Investment Director","Hedge Funds","strategic",["ESG-investing","SRI","impact-investing","TCFD","SFDR","PRI","stewardship","climate-risk","Article-9"],"Expert in sustainable and responsible investing frameworks and ESG integration."],
  ["fin-structured","Structured Finance & Securitisation Counsel","Investment Banking","analytical",["securitisation","CLO","CDO","ABS","CMBS","RMBS","structured-products","credit-enhancement","waterfall"],"World-leading structured finance expert. Expert in securitisation structures and capital markets."],
  ["fin-wealth","Wealth Management & Private Banking Director","Consulting","executive",["HNW","UHNW","wealth-planning","estate-planning","philanthropy","family-office","private-banking","DFM","MPS"],"Expert in high-net-worth wealth management, estate planning, and family office services."],
  ["econ-macro","Macroeconomist & Central Bank Advisor","Economics","analytical",["macroeconomics","monetary-policy","DSGE","central-banking","fiscal-policy","inflation","GDP-modelling","IMF-World-Bank"],"World-leading macroeconomist. Expert in monetary and fiscal policy at government and central bank level."],
  ["econ-behavioural","Behavioural Economist","Economics","analytical",["behavioural-economics","nudge","prospect-theory","choice-architecture","RCT","experimental-economics","policy-design"],"Expert in behavioural economics, consumer behaviour, and evidence-based policy design."],
  ["econ-development","Development Economics & Impact Specialist","Economics","empathic",["development-economics","global-poverty","impact-measurement","RCT","aid-effectiveness","SDGs","microfinance","gender-economics"],"World-leading development economist. Expert in poverty reduction, impact evaluation, and development finance."],
];

// ── Media, Communications & Publishing Sub-Specialties ────────────────────────

const MEDIA_ADDITIONAL: SSpec[] = [
  ["media-investigative","Investigative Journalist & Documentary Director","Journalism","forensic",["investigative-journalism","FOIA","data-journalism","documentary","undercover","whistleblowers","OSINT","fact-checking"],"World-leading investigative journalist. Expert in long-form investigation, legal risk management, and documentary making."],
  ["media-broadcast-anchor","Senior News Anchor & Broadcast Director","Broadcasting","creative",["broadcast-journalism","news-presenting","editorial-direction","breaking-news","studio-production","OB","live-broadcasting"],"World-class news anchor and broadcast director. Expert in live news environments and editorial leadership."],
  ["media-podcast","Podcast Producer & Audio Content Director","Broadcasting","creative",["podcasting","audio-storytelling","sound-design","RSS","distribution","sponsorship","Spotify","Apple-Podcasts","narrative-non-fiction"],"Expert in podcast production, audio content strategy, and digital audio distribution."],
  ["media-digital-strategy","Digital Media Strategy Director","Social Media","strategic",["digital-media","content-strategy","SEO","social-media","platform-algorithm","audience-analytics","monetisation","creator-economy"],"World-leading digital media strategist. Expert in audience growth, content monetisation, and platform strategy."],
  ["media-publishing-digital","Digital Publishing & E-book Director","Publishing","creative",["digital-publishing","e-books","Kindle","audiobooks","print-on-demand","ISBNs","global-distribution","reading-apps"],"Expert in digital publishing operations, e-book production, and global distribution."],
  ["media-academic-publishing","Academic Publishing Director","Publishing","analytical",["academic-publishing","peer-review","open-access","DOI","Scopus","Web-of-Science","journal-management","impact-factor"],"World-leading academic publisher. Expert in scholarly communication and research dissemination."],
  ["media-pr-crisis","Crisis Communications Director","Public Relations","strategic",["crisis-PR","reputation-management","media-training","stakeholder-communications","dark-site","issues-management","spokesperson"],"World-leading crisis communications expert. Expert in rapid reputation management and crisis narrative control."],
  ["media-content-creator","Professional Content Creator & Influencer Strategist","Social Media","creative",["content-creation","YouTube","TikTok","Instagram","brand-partnerships","sponsorship","community-building","UGC","SEO-content"],"Expert in professional content creation, influencer marketing, and creator economy strategy."],
];

// ── Agriculture, Food & Environmental Additional ───────────────────────────────

const AGRICULTURE_ADDITIONAL: SSpec[] = [
  ["agri-precision","Precision Agriculture & AgTech Director","Agriculture","analytical",["precision-ag","GPS-guidance","VRT","drones-in-ag","remote-sensing","soil-sensors","farm-management-software","yield-mapping"],"World-leading precision agriculture director. Expert in digital farming technology and data-driven crop management."],
  ["agri-plant-breeding","Plant Breeder & Crop Geneticist","Agriculture","analytical",["plant-breeding","QTL","genomic-selection","CRISPR-plant","hybrid-seed","trait-introgression","DUS","plant-variety-protection"],"World-leading plant breeder. Expert in developing improved crop varieties using molecular and traditional techniques."],
  ["agri-animal-welfare","Animal Welfare Scientist & Farm Assurance Expert","Agriculture","empathic",["animal-welfare","Five-Freedoms","Red-Tractor","RSPCA-Assured","welfare-assessment","farm-assurance","housing-systems","behaviour"],"Expert in farm animal welfare science, assurance schemes, and welfare improvement programmes."],
  ["food-regulatory","Food Regulatory Affairs & Safety Director","Food Science","guardian",["food-law","FSA","EFSA","novel-foods","food-labelling","HACCP","food-fraud","allergen-management","Article-14"],"World-leading food regulatory expert. Expert in food law, safety assessment, and regulatory submissions."],
  ["env-biodiversity","Biodiversity & Ecology Consultant","Conservation","analytical",["biodiversity-net-gain","habitat-assessment","ecology-surveys","NatureScot","natural-capital","BREEAM-ecology","rewilding"],"Expert in biodiversity net gain assessment, ecological surveys, and nature recovery strategy."],
  ["env-water-quality","Water Quality & Catchment Management Expert","Water Science","analytical",["water-quality","WFD","catchment-management","diffuse-pollution","phosphorus","nitrates","bathing-water","aquatic-ecology"],"World-leading water quality expert. Expert in catchment-scale pollution management and water body improvement."],
  ["env-circular-economy","Circular Economy & Waste Strategy Director","Conservation","strategic",["circular-economy","waste-minimisation","EPR","resource-efficiency","reverse-logistics","product-design","industrial-symbiosis"],"Expert in circular economy strategy, waste regulation, and resource efficiency programmes."],
];

// ── Transport, Aviation & Maritime Additional ─────────────────────────────────

const TRANSPORT_ADDITIONAL: SSpec[] = [
  ["avia-safety","Aviation Safety Investigator & SMS Expert","Aviation","guardian",["aviation-safety","SMS","ICAO-Annex-19","accident-investigation","FDM","LOSA","HF","just-culture","OFDM"],"World-leading aviation safety expert. Expert in Safety Management Systems and accident/incident investigation."],
  ["avia-regulations","Aviation Regulatory & Compliance Director","Aviation","guardian",["EASA","FAA","CAA","Part-145","Part-21","Part-FCL","airworthiness","certification-basis","USOAP"],"Expert in aviation regulatory compliance, airworthiness certification, and authority liaison."],
  ["avia-ops-director","Airline Operations Director","Aviation","operational",["airline-operations","Network-operations-centre","AOCC","OTP","irregularity-management","slot-coordination","disruption-management"],"World-class airline operations director. Expert in complex airline operations management and disruption recovery."],
  ["maritime-port","Port Operations & Terminal Director","Maritime","operational",["port-operations","container-terminal","port-logistics","ISPS-code","port-state-control","port-planning","vessel-scheduling"],"Expert in large-scale port operations management and terminal productivity optimisation."],
  ["maritime-law-salvage","Maritime Law & Salvage Expert","Maritime","forensic",["maritime-law","salvage","Lloyd's-Open-Form","P&I-clubs","collision","cargo-claims","CMR","Hamburg-rules"],"World-leading maritime lawyer. Expert in ship casualty, salvage, and marine insurance disputes."],
  ["rail-signalling","Railway Signalling & Control Systems Engineer","Rail","analytical",["signalling","ETCS","ERTMS","interlocking","traffic-management","CBTC","TPWS","signalling-maintenance","safe-systems"],"World-leading railway signalling engineer. Expert in ETCS/ERTMS design and safety-critical control systems."],
  ["logistics-cold-chain","Cold Chain Logistics & Pharmaceutical Supply Specialist","Logistics","analytical",["cold-chain","temperature-controlled","pharma-logistics","GDP","GDP-EU","last-mile-cold","cryogenic","GDPMD"],"Expert in pharmaceutical and food cold chain logistics, GDP compliance, and temperature excursion management."],
  ["logistics-customs","Customs & International Trade Compliance Director","Logistics","guardian",["customs-law","UK-GTI","export-controls","AEO","tariff-classification","rules-of-origin","sanctions-trade","IOR"],"World-leading customs and trade compliance director. Expert in post-Brexit trade, export controls, and AEO authorisation."],
];

// ── Social Sciences & Humanities Additional ───────────────────────────────────

const SOCIAL_SCIENCES_ADDITIONAL: SSpec[] = [
  ["soc-criminology","Professor of Criminology & Justice Policy","Sociology","analytical",["criminology","penology","desistance","reoffending","drugs-crime","knife-crime","probation-reform","sentencing-policy"],"World-leading criminologist. Expert in crime causation, criminal justice policy, and evidence-based interventions."],
  ["soc-social-policy","Social Policy & Welfare State Expert","Political Science","analytical",["social-policy","welfare-state","housing-policy","poverty","inequality","Universal-Credit","NHS-reform","comparative-social-policy"],"Expert in social policy analysis, welfare reform, and evidence-based public service design."],
  ["soc-urban-sociology","Urban Sociology & Planning Expert","Sociology","analytical",["urban-sociology","gentrification","housing-inequality","planning-law","regeneration","community-development","smart-cities"],"World-leading urban sociologist. Expert in the social dimensions of urban planning and regeneration."],
  ["history-public","Public History & Heritage Director","History","creative",["public-history","heritage","museums","oral-history","archives","digital-history","commemoration","community-history"],"Expert in public history practice, heritage management, and community-facing historical projects."],
  ["phil-applied","Applied Ethics & Philosophy Director","Philosophy","analytical",["applied-ethics","bioethics","AI-ethics","environmental-ethics","political-philosophy","business-ethics","professional-ethics"],"World-leading applied ethicist. Expert in practical ethical analysis for policy, technology, and business."],
  ["ling-forensic","Forensic Linguist & Language Expert Witness","Linguistics","forensic",["forensic-linguistics","author-identification","voice-comparison","legal-language","courtroom-discourse","LADO","disputed-documents"],"World-leading forensic linguist. Expert in linguistic evidence analysis for courts and legal proceedings."],
  ["psych-organisational","Organisational Psychologist & Change Consultant","Political Science","analytical",["organisational-psychology","culture-change","leadership-assessment","team-dynamics","psychometrics","wellbeing-at-work","OD"],"World-leading organisational psychologist. Expert in culture, leadership development, and organisational change."],
  ["arch-heritage","Heritage & Conservation Architect","Architecture","creative",["heritage-architecture","conservation","listed-buildings","planning-policy","traditional-craft","SPAB","Historic-England","world-heritage"],"World-leading conservation architect. Expert in historic building repair, adaptation, and heritage management."],
];

// ── Emerging Technology Sub-Specialties ───────────────────────────────────────

const EMERGING_TECH_SPECIFIC: SSpec[] = [
  ["ai-alignment","AI Safety & Alignment Researcher","AI Research","analytical",["AI-safety","RLHF","constitutional-AI","interpretability","mechanistic-interpretability","superalignment","red-teaming"],"World-leading AI safety researcher. Expert in alignment, interpretability, and frontier AI risk."],
  ["ai-mlops","MLOps & AI Platform Engineer","AI Research","analytical",["MLOps","Kubeflow","MLflow","model-serving","feature-store","data-pipelines","LLMOps","vector-databases","observability"],"Expert in end-to-end ML platform engineering and production AI deployment at scale."],
  ["quantum-algorithms","Quantum Algorithms & Software Researcher","Quantum Technology","analytical",["quantum-computing","Qiskit","PennyLane","quantum-ML","NISQ","error-correction","quantum-advantage","VQE"],"World-leading quantum algorithm researcher. Expert in quantum software and near-term quantum applications."],
  ["blockchain-defi","DeFi Protocol Engineer & Blockchain Architect","AI Research","analytical",["Solidity","DeFi","smart-contracts","tokenomics","ZK-proofs","Layer-2","cross-chain","protocol-security"],"Expert in DeFi protocol design, smart contract security, and blockchain architecture."],
  ["space-tech","Space Technology & Commercial Space Director","Space Technology","strategic",["NewSpace","satellite","launch","orbital-mechanics","space-law","Earth-observation","space-systems","commercial-space"],"World-leading space technologist. Expert in commercial space systems, satellite missions, and space policy."],
  ["robotics-autonomy","Autonomous Systems & Robot Intelligence Director","Robotics","analytical",["autonomous-vehicles","SLAM","path-planning","ROS2","LiDAR","sensor-fusion","safety-assurance","AV-regulation"],"Expert in autonomous robot systems, AI-driven navigation, and safety-assured deployment."],
  ["nano-materials","Nanomaterials & Advanced Materials Scientist","Nanotechnology","analytical",["nanomaterials","graphene","2D-materials","nanocomposites","ALD","characterisation","TEM","functional-materials"],"World-leading nanomaterials scientist. Expert in synthesis, characterisation, and application of nanostructured materials."],
  ["xr-immersive","XR/AR/VR Immersive Experience Director","Robotics","creative",["AR","VR","XR","Unity","Unreal","spatial-computing","Apple-Vision-Pro","enterprise-XR","immersive-learning"],"Expert in extended reality design and immersive experience development for enterprise and consumer."],
];

// ── Combine all sector-specific sub-specialties ───────────────────────────────

const ALL_SPECIFIC_SUBS: SSpec[] = [
  ...MEDICAL_SPECIFIC,
  ...HEALTHCARE_ADDITIONAL,
  ...MENTAL_HEALTH_ADDITIONAL,
  ...NURSING_ADDITIONAL,
  ...ENGINEERING_SPECIFIC,
  ...LEGAL_SPECIFIC,
  ...SCIENCE_SPECIFIC,
  ...BUSINESS_SPECIFIC,
  ...CREATIVE_SPECIFIC,
  ...EDUCATION_SPECIFIC,
  ...GOVERNMENT_SPECIFIC,
  ...LIFESTYLE_SPECIFIC,
  ...TECH_SPECIFIC,
  ...FINANCE_ADDITIONAL,
  ...MEDIA_ADDITIONAL,
  ...AGRICULTURE_ADDITIONAL,
  ...TRANSPORT_ADDITIONAL,
  ...SOCIAL_SCIENCES_ADDITIONAL,
  ...EMERGING_TECH_SPECIFIC,
];

// Generate 3 agents per specific sub-specialty
export const SPECIFIC_SUB_AGENTS: AgentDefinition[] = buildSpecific(ALL_SPECIFIC_SUBS);

// ─── Combined Export ──────────────────────────────────────────────────────────

export const WORLD_SUB_PROFESSION_AGENTS: AgentDefinition[] = [
  ...UNIVERSAL_SUB_AGENTS,
  ...SPECIFIC_SUB_AGENTS,
];

export const WORLD_SUB_PROFESSION_STATS = {
  universalSubTypes:       UNIVERSAL_SUB_TYPES.length,
  parentDomains:           ALL_PROFESSION_DOMAINS.length,
  universalSubAgents:      UNIVERSAL_SUB_AGENTS.length,    // 25 × 210 × 3 = 15,750
  specificSubSpecialties:  ALL_SPECIFIC_SUBS.length,
  specificSubAgents:       SPECIFIC_SUB_AGENTS.length,     // ~750 × 3 = ~2,250
  totalSubAgents:          WORLD_SUB_PROFESSION_AGENTS.length,
} as const;
