export const siteMeta = {
  brand: 'RishabRK.tech',
  siteName: 'Rishab Khatokar Portfolio',
  title: 'Rishab Khatokar | Data Analyst',
  description:
    'Data analyst with experience across healthcare, financial, and business analytics, focused on predictive modeling, BI dashboards, and scalable data pipelines.',
  defaultImage: '/assets/img/bg_image_1.jpg',
};

export const profile = {
  name: 'Rishab Khatokar',
  shortName: 'Rishab',
  role: 'Data Analyst',
  location: 'Arizona, USA',
  email: 'rishabkhatokar9@gmail.com',
  phone: '+1 (520)-205-0384',
  linkedin: 'https://www.linkedin.com/in/rishab-khatokar-90286b344/',
  github: 'https://github.com/rish742',
  resumePath: '/assets/Khatokar_Rishab_Resume.pdf',
  summary:
    'Data Analyst with 5 years of experience in healthcare, financial, and business analytics, specializing in data engineering, predictive modeling, and business intelligence. Adept at designing and optimizing ETL pipelines in Azure and AWS, building machine learning models for risk scoring and customer churn prediction, and creating interactive dashboards using Tableau and Power BI.',
  highlights: [
    'Healthcare, finance, and business analytics experience',
    'Predictive modeling, ETL pipelines, and BI dashboards',
    'Comfortable translating complex metrics for non-technical stakeholders',
  ],
};

export const quickFacts = [
  { label: 'Based in', value: 'Arizona, USA' },
  { label: 'Specializes in', value: 'Healthcare and financial analytics' },
  { label: 'Focus', value: 'Data engineering, BI, and predictive models' },
];

export const skillGroups = [
  {
    title: 'Technical Skills',
    items: [
      'Python',
      'Pandas',
      'NumPy',
      'Scikit-learn',
      'SQL',
      'PySpark',
      'VBA / Macros',
      'Azure',
      'AWS',
      'Snowflake',
      'ETL pipeline development',
      'Data integration',
      'Power BI',
      'Tableau',
      'Jupyter Notebook',
      'Git',
      'APIs',
      'RESTful services',
    ],
  },
  {
    title: 'Machine Learning & Analytics',
    items: [
      'Predictive modeling',
      'Random Forest',
      'Logistic Regression',
      'XGBoost',
      'Feature engineering',
      'Model evaluation',
      'Anomaly detection',
      'Regression analysis',
      'Time series forecasting',
      'Clustering',
      'NLP basics',
      'A/B testing',
    ],
  },
  {
    title: 'Data Management & Reporting',
    items: [
      'Data cleaning',
      'Validation',
      'Transformation',
      'Workflow automation',
      'KPI tracking',
      'Financial modeling',
      'Reporting efficiency',
      'Performance monitoring',
      'Dashboards',
      'Pivot tables',
      'Data reconciliation',
      'Data governance',
      'Metadata management',
    ],
  },
  {
    title: 'Healthcare Domain Expertise',
    items: [
      'Claims datasets',
      'Clinical datasets',
      'Provider datasets',
      'Medicare / Medicaid',
      'HIPAA compliance',
      'HEDIS',
      'Payment integrity',
      'Population health analytics',
      'Risk adjustment',
      'Patient outcomes analysis',
      'Care management metrics',
    ],
  },
  {
    title: 'Business & Strategic Skills',
    items: [
      'Process improvement',
      'Operational efficiency',
      'Cross-functional collaboration',
      'Stakeholder management',
      'Actionable insights',
      'Decision support',
      'Project management',
      'Requirement gathering',
      'Business process analysis',
      'Strategic planning',
    ],
  },
];

export const featuredSkills = [
  'Python',
  'SQL',
  'PySpark',
  'Azure',
  'AWS',
  'Snowflake',
  'Power BI',
  'Tableau',
  'Predictive modeling',
  'Healthcare analytics',
];

export const experience = [
  {
    role: 'Data Analyst',
    company: 'United Health Group',
    location: 'USA',
    period: 'Aug 2025 - Present',
    bullets: [
      'Lead advanced analytics on large-scale U.S. healthcare datasets, including claims, clinical, and provider data, applying predictive modeling and machine learning to identify trends, improve patient outcomes, and ensure HIPAA-compliant data handling.',
      'Design and maintain interactive dashboards and reports using Tableau, turning complex clinical and financial metrics into actionable insights for non-technical stakeholders.',
      'Develop and optimize Python-based data pipelines and SQL/PySpark queries in Azure to support high-quality, scalable ETL workflows for sensitive healthcare reporting.',
      'Partner with data scientists, actuarial teams, and business units to support ML-driven risk prediction and evidence-based Medicare and Medicaid strategy.',
      'Support payment integrity and quality initiatives through data validation, root-cause analysis, anomaly detection, and reporting automation.',
    ],
  },
  {
    role: 'Data Analyst',
    company: 'Boost fincrop group',
    location: 'India',
    period: 'Aug 2022 - Jul 2024',
    bullets: [
      'Developed and maintained financial models to forecast loan performance and evaluate investment opportunities while reducing non-performing assets and operational risk.',
      'Monitored KPIs and portfolio performance, delivering real-time insight to senior management across vehicle finance, SME loans, and investment products.',
      'Built ETL pipelines using Python and SQL to integrate data from multiple financial platforms with strong emphasis on data accuracy, integrity, and regulatory compliance.',
      'Created Power BI dashboards translating market trends, credit scores, and portfolio data into practical lending and investment decisions.',
      'Automated data collection and reporting workflows using Python, SQL, and Excel VBA to reduce manual effort and improve reporting speed.',
    ],
  },
  {
    role: 'Data Analyst',
    company: 'Adons Softech',
    location: 'India',
    period: 'Sep 2020 - Jul 2022',
    bullets: [
      'Collected and analyzed information from multiple sources to identify trends, improve operations, and provide actionable recommendations for clients.',
      'Turned large volumes of business data into clear insights and performance metrics for managers, supporting stronger project delivery decisions.',
      'Managed structured datasets with Excel and SQL to keep analysis, reporting, and planning accurate and reliable across multiple engagements.',
      'Analyzed business processes and conducted market research to uncover inefficiencies and opportunities for process improvement.',
      'Built Power BI dashboards that converted complex information into decision-ready visual reporting for stakeholders.',
    ],
  },
];

export const projects = [
  {
    title: 'Customer Churn Prediction',
    stack: ['Python', 'Scikit-learn', 'Tableau'],
    summary:
      'Machine learning workflow for predicting churn from transactional and behavioral data so teams can act on retention risk sooner.',
    bullets: [
      'Built and evaluated classification models to predict churn across multiple customer segments.',
      'Engineered features and cleaned historical data to improve prediction quality and decision usefulness.',
      'Used Tableau dashboards to visualize churn probabilities, customer segments, and key risk factors.',
    ],
    featured: true,
    accent: 'Predictive Modeling',
  },
  {
    title: 'Financial Risk Scoring System',
    stack: ['SQL', 'Power BI'],
    summary:
      'Risk scoring workflow for loan and investment portfolios, built to improve credit decisions and highlight high-risk accounts.',
    bullets: [
      'Enhanced risk scoring logic using historical financial and transactional data.',
      'Engineered SQL queries and data models to segment customers and surface portfolio exposure.',
      'Planned interactive Power BI views for real-time risk monitoring and stakeholder review.',
    ],
    featured: true,
    accent: 'Financial Analytics',
  },
  {
    title: 'Healthcare Data Pipeline',
    stack: ['AWS', 'Snowflake', 'Python'],
    summary:
      'End-to-end healthcare pipeline for ingesting, transforming, and reporting on clinical, claims, and provider datasets with HIPAA-aware handling.',
    bullets: [
      'Designed ETL workflows that transformed raw healthcare data into structured analytics-ready outputs.',
      'Integrated AWS and Snowflake for scalable reporting and near real-time analysis.',
      'Delivered Power BI dashboards for healthcare KPIs, claim trends, and patient outcomes.',
    ],
    featured: true,
    accent: 'Healthcare Data Engineering',
    image: '/assets/img/AI_Polypharmacy.png',
  },
];

export const education = [
  {
    degree: 'Master of Science (MS)',
    focus: 'Information Science / Machine Learning',
    school: 'University of Arizona',
    location: 'USA',
  },
  {
    degree: 'Bachelor of Technology (B.Tech)',
    focus: 'Electronics and Communication',
    school: 'Dayananda Sagar University',
    location: 'India',
  },
];

// TODO: The current resume PDF does not list certifications explicitly.
export const certifications: string[] = [];

export const contactMethods = [
  {
    label: 'Email',
    value: profile.email,
    href: `mailto:${profile.email}`,
  },
  {
    label: 'LinkedIn',
    value: 'rishab-khatokar-90286b344',
    href: profile.linkedin,
  },
  {
    label: 'GitHub',
    value: 'rish742',
    href: profile.github,
  },
  {
    label: 'Phone',
    value: profile.phone,
    href: `tel:${profile.phone.replace(/[^+\\d]/g, '')}`,
  },
];
