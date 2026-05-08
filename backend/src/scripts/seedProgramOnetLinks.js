const { prisma } = require('../db/prisma');

const PROGRAM_ONET_MAP = {
  'FPTU-SE': [
    { onetCode: '15-1252.00', relevance: 10, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1253.00', relevance: 8, note: 'Software Quality Assurance Analysts and Testers' },
    { onetCode: '15-1299.08', relevance: 7, note: 'Computer Systems Engineers/Architects' },
    { onetCode: '15-1254.00', relevance: 6, note: 'Web Developers' },
  ],
  'CTU-SE': [
    { onetCode: '15-1252.00', relevance: 10, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1253.00', relevance: 8, note: 'Software Quality Assurance Analysts and Testers' },
    { onetCode: '15-1254.00', relevance: 7, note: 'Web Developers' },
  ],
  'DUT-SE': [
    { onetCode: '15-1252.00', relevance: 10, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1253.00', relevance: 8, note: 'Software Quality Assurance Analysts and Testers' },
    { onetCode: '15-1299.08', relevance: 7, note: 'Computer Systems Engineers/Architects' },
  ],
  'HUTECH-SE': [
    { onetCode: '15-1252.00', relevance: 10, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1254.00', relevance: 8, note: 'Web Developers' },
    { onetCode: '15-1253.00', relevance: 7, note: 'Software Quality Assurance Analysts and Testers' },
  ],
  'TDTU-SE': [
    { onetCode: '15-1252.00', relevance: 10, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1253.00', relevance: 8, note: 'Software Quality Assurance Analysts and Testers' },
    { onetCode: '15-1254.00', relevance: 7, note: 'Web Developers' },
  ],
  'HCMUT-ASE': [
    { onetCode: '15-1252.00', relevance: 10, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1299.08', relevance: 9, note: 'Computer Systems Engineers/Architects' },
    { onetCode: '15-1253.00', relevance: 7, note: 'Software Quality Assurance Analysts and Testers' },
    { onetCode: '15-1244.00', relevance: 6, note: 'Network and Computer Systems Administrators' },
  ],

  'DUT-CS': [
    { onetCode: '15-1252.00', relevance: 9, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-2051.00', relevance: 8, note: 'Data Scientists' },
    { onetCode: '15-1299.08', relevance: 7, note: 'Computer Systems Engineers/Architects' },
    { onetCode: '15-1221.00', relevance: 6, note: 'Computer and Information Research Scientists' },
  ],
  'HCMUS-CS': [
    { onetCode: '15-1252.00', relevance: 9, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1221.00', relevance: 8, note: 'Computer and Information Research Scientists' },
    { onetCode: '15-1252.00', relevance: 7, note: 'Software Developers' },
  ],
  'HCMUT-CS-VN': [
    { onetCode: '15-1252.00', relevance: 9, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1221.00', relevance: 8, note: 'Computer and Information Research Scientists' },
    { onetCode: '15-1299.08', relevance: 7, note: 'Computer Systems Engineers/Architects' },
  ],
  'HUST-CS': [
    { onetCode: '15-1252.00', relevance: 9, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1221.00', relevance: 8, note: 'Computer and Information Research Scientists' },
    { onetCode: '15-2051.00', relevance: 7, note: 'Data Scientists' },
  ],
  'HUST-GICT': [
    { onetCode: '15-1252.00', relevance: 10, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1211.00', relevance: 8, note: 'Computer Systems Analysts' },
    { onetCode: '15-1299.09', relevance: 7, note: 'Information Technology Project Managers' },
    { onetCode: '15-1254.00', relevance: 6, note: 'Web Developers' },
  ],
  'TDTU-CS': [
    { onetCode: '15-1252.00', relevance: 9, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-2051.00', relevance: 7, note: 'Data Scientists' },
    { onetCode: '15-1254.00', relevance: 6, note: 'Web Developers' },
  ],
  'VGU-CSE': [
    { onetCode: '15-1252.00', relevance: 9, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1221.00', relevance: 8, note: 'Computer and Information Research Scientists' },
    { onetCode: '15-1299.08', relevance: 7, note: 'Computer Systems Engineers/Architects' },
  ],
  'UIT-CS': [
    { onetCode: '15-1252.00', relevance: 9, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1221.00', relevance: 8, note: 'Computer and Information Research Scientists' },
    { onetCode: '15-1299.08', relevance: 7, note: 'Computer Systems Engineers/Architects' },
  ],
  'UIT-SE': [
    { onetCode: '15-1252.00', relevance: 10, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1253.00', relevance: 8, note: 'Software Quality Assurance Analysts and Testers' },
    { onetCode: '15-1299.08', relevance: 7, note: 'Computer Systems Engineers/Architects' },
  ],
  'TDTU-CSIT-JOINT': [
    { onetCode: '15-1252.00', relevance: 10, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1211.00', relevance: 8, note: 'Computer Systems Analysts' },
    { onetCode: '15-1299.09', relevance: 7, note: 'Information Technology Project Managers' },
  ],
  'CTU-CSCI': [
    { onetCode: '15-1252.00', relevance: 9, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1221.00', relevance: 8, note: 'Computer and Information Research Scientists' },
    { onetCode: '15-2051.00', relevance: 7, note: 'Data Scientists' },
  ],

  'FPTU-AI': [
    { onetCode: '15-2051.00', relevance: 10, isPrimary: true, note: 'Data Scientists' },
    { onetCode: '15-1221.00', relevance: 9, note: 'Computer and Information Research Scientists' },
    { onetCode: '15-1252.00', relevance: 7, note: 'Software Developers' },
    { onetCode: '15-2041.00', relevance: 6, note: 'Statisticians' },
  ],
  'DUT-AI': [
    { onetCode: '15-2051.00', relevance: 10, isPrimary: true, note: 'Data Scientists' },
    { onetCode: '15-1221.00', relevance: 9, note: 'Computer and Information Research Scientists' },
    { onetCode: '15-1252.00', relevance: 7, note: 'Software Developers' },
  ],
  'HCMUS-AI': [
    { onetCode: '15-1221.00', relevance: 10, isPrimary: true, note: 'Computer and Information Research Scientists' },
    { onetCode: '15-2051.00', relevance: 9, note: 'Data Scientists' },
    { onetCode: '15-1252.00', relevance: 7, note: 'Software Developers' },
  ],
  'HCMUS-DS': [
    { onetCode: '15-2051.00', relevance: 10, isPrimary: true, note: 'Data Scientists' },
    { onetCode: '15-2041.00', relevance: 8, note: 'Statisticians' },
    { onetCode: '15-1243.01', relevance: 7, note: 'Data Warehousing Specialists' },
    { onetCode: '15-1211.00', relevance: 6, note: 'Computer Systems Analysts' },
  ],
  'HUST-DS': [
    { onetCode: '15-2051.00', relevance: 10, isPrimary: true, note: 'Data Scientists' },
    { onetCode: '15-1221.00', relevance: 8, note: 'Computer and Information Research Scientists' },
    { onetCode: '15-2041.00', relevance: 7, note: 'Statisticians' },
    { onetCode: '15-1243.01', relevance: 6, note: 'Data Warehousing Specialists' },
  ],
  'HUTECH-AI': [
    { onetCode: '15-2051.00', relevance: 10, isPrimary: true, note: 'Data Scientists' },
    { onetCode: '15-1221.00', relevance: 8, note: 'Computer and Information Research Scientists' },
    { onetCode: '15-1252.00', relevance: 7, note: 'Software Developers' },
  ],
  'UIT-AI': [
    { onetCode: '15-1221.00', relevance: 10, isPrimary: true, note: 'Computer and Information Research Scientists' },
    { onetCode: '15-2051.00', relevance: 9, note: 'Data Scientists' },
    { onetCode: '15-1252.00', relevance: 7, note: 'Software Developers' },
    { onetCode: '15-2041.00', relevance: 6, note: 'Statisticians' },
  ],
  'HCMUT-DEBD': [
    { onetCode: '15-1243.01', relevance: 10, isPrimary: true, note: 'Data Warehousing Specialists' },
    { onetCode: '15-2051.00', relevance: 9, note: 'Data Scientists' },
    { onetCode: '15-1243.00', relevance: 8, note: 'Database Administrators' },
    { onetCode: '15-1252.00', relevance: 6, note: 'Software Developers' },
  ],

  'HCMUS-IS': [
    { onetCode: '15-1211.00', relevance: 10, isPrimary: true, note: 'Computer Systems Analysts' },
    { onetCode: '15-1299.09', relevance: 8, note: 'Information Technology Project Managers' },
    { onetCode: '15-1243.00', relevance: 7, note: 'Database Administrators' },
    { onetCode: '15-1252.00', relevance: 6, note: 'Software Developers' },
  ],
  'HUTECH-IS': [
    { onetCode: '15-1211.00', relevance: 10, isPrimary: true, note: 'Computer Systems Analysts' },
    { onetCode: '15-1299.09', relevance: 8, note: 'Information Technology Project Managers' },
    { onetCode: '15-1243.00', relevance: 7, note: 'Database Administrators' },
  ],
  'UIT-IS-VN': [
    { onetCode: '15-1211.00', relevance: 10, isPrimary: true, note: 'Computer Systems Analysts' },
    { onetCode: '15-1243.00', relevance: 8, note: 'Database Administrators' },
    { onetCode: '15-1299.09', relevance: 7, note: 'Information Technology Project Managers' },
  ],
  'CTU-IS': [
    { onetCode: '15-1211.00', relevance: 10, isPrimary: true, note: 'Computer Systems Analysts' },
    { onetCode: '15-1243.00', relevance: 8, note: 'Database Architects' },
    { onetCode: '15-1299.09', relevance: 7, note: 'Information Technology Project Managers' },
  ],
  'VGU-BIS': [
    { onetCode: '15-1211.00', relevance: 10, isPrimary: true, note: 'Computer Systems Analysts' },
    { onetCode: '15-1299.09', relevance: 9, note: 'Information Technology Project Managers' },
    { onetCode: '11-3021.00', relevance: 7, note: 'Computer and Information Systems Managers' },
    { onetCode: '15-1243.00', relevance: 6, note: 'Database Administrators' },
  ],

  'HCMUS-NET': [
    { onetCode: '15-1244.00', relevance: 10, isPrimary: true, note: 'Network and Computer Systems Administrators' },
    { onetCode: '15-1231.00', relevance: 8, note: 'Computer Network Support Specialists' },
    { onetCode: '15-1212.00', relevance: 7, note: 'Information Security Analysts' },
  ],
  'CTU-NET': [
    { onetCode: '15-1244.00', relevance: 10, isPrimary: true, note: 'Network and Computer Systems Administrators' },
    { onetCode: '15-1231.00', relevance: 8, note: 'Computer Network Support Specialists' },
    { onetCode: '15-1212.00', relevance: 7, note: 'Information Security Analysts' },
  ],
  'TDTU-NET': [
    { onetCode: '15-1244.00', relevance: 10, isPrimary: true, note: 'Network and Computer Systems Administrators' },
    { onetCode: '15-1231.00', relevance: 8, note: 'Computer Network Support Specialists' },
    { onetCode: '15-1212.00', relevance: 7, note: 'Information Security Analysts' },
  ],
  'UIT-NET': [
    { onetCode: '15-1244.00', relevance: 10, isPrimary: true, note: 'Network and Computer Systems Administrators' },
    { onetCode: '15-1231.00', relevance: 8, note: 'Computer Network Support Specialists' },
    { onetCode: '15-1212.00', relevance: 7, note: 'Information Security Analysts' },
  ],

  'FPTU-IA': [
    { onetCode: '15-1212.00', relevance: 10, isPrimary: true, note: 'Information Security Analysts' },
    { onetCode: '15-1299.05', relevance: 9, note: 'Penetration Testers and Vulnerability Analysts' },
    { onetCode: '15-1244.00', relevance: 7, note: 'Network and Computer Systems Administrators' },
  ],
  'UIT-INFOSEC': [
    { onetCode: '15-1212.00', relevance: 10, isPrimary: true, note: 'Information Security Analysts' },
    { onetCode: '15-1299.05', relevance: 9, note: 'Information Security Engineers' },
    { onetCode: '15-1244.00', relevance: 7, note: 'Network and Computer Systems Administrators' },
  ],

  'CTU-CS': [
    { onetCode: '15-1232.00', relevance: 9, isPrimary: true, note: 'Computer User Support Specialists' },
    { onetCode: '15-1252.00', relevance: 8, note: 'Software Developers' },
    { onetCode: '15-1244.00', relevance: 7, note: 'Network and Computer Systems Administrators' },
    { onetCode: '15-1211.00', relevance: 6, note: 'Computer Systems Analysts' },
  ],
  'UIT-IT': [
    { onetCode: '15-1232.00', relevance: 9, isPrimary: true, note: 'Computer User Support Specialists' },
    { onetCode: '15-1252.00', relevance: 8, note: 'Software Developers' },
    { onetCode: '15-1244.00', relevance: 7, note: 'Network and Computer Systems Administrators' },
  ],

  'UIT-EMBEDDED': [
    { onetCode: '17-2072.00', relevance: 10, isPrimary: true, note: 'Electronics Engineers, Except Computer' },
    { onetCode: '15-1252.00', relevance: 8, note: 'Software Developers' },
    { onetCode: '17-2061.00', relevance: 7, note: 'Computer Hardware Engineers' },
  ],
  'HUST-ICT': [
    { onetCode: '17-2061.00', relevance: 10, isPrimary: true, note: 'Computer Hardware Engineers' },
    { onetCode: '15-1252.00', relevance: 8, note: 'Software Developers' },
    { onetCode: '17-2072.00', relevance: 7, note: 'Electronics Engineers, Except Computer' },
  ],
  'HUST-HEDSPI': [
    { onetCode: '15-1252.00', relevance: 10, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1211.00', relevance: 8, note: 'Computer Systems Analysts' },
    { onetCode: '15-1254.00', relevance: 7, note: 'Web Developers' },
  ],
  'HCMUT-CE': [
    { onetCode: '17-2061.00', relevance: 10, isPrimary: true, note: 'Computer Hardware Engineers' },
    { onetCode: '15-1241.00', relevance: 8, note: 'Computer Network Architects' },
    { onetCode: '15-1252.00', relevance: 7, note: 'Software Developers' },
  ],
  'HCMUT-SEMICON': [
    { onetCode: '17-2072.00', relevance: 10, isPrimary: true, note: 'Electronics Engineers, Except Computer' },
    { onetCode: '17-2061.00', relevance: 9, note: 'Computer Hardware Engineers' },
    { onetCode: '17-2112.00', relevance: 7, note: 'Industrial Engineers' },
  ],
  'VGU-EEIT': [
    { onetCode: '17-2071.00', relevance: 10, isPrimary: true, note: 'Electrical Engineers' },
    { onetCode: '17-2072.00', relevance: 8, note: 'Electronics Engineers, Except Computer' },
    { onetCode: '15-1252.00', relevance: 6, note: 'Software Developers' },
  ],

  'FPTU-GD': [
    { onetCode: '27-1024.00', relevance: 10, isPrimary: true, note: 'Graphic Designers' },
    { onetCode: '15-1255.00', relevance: 8, note: 'Web and Digital Interface Designers' },
    { onetCode: '27-1014.00', relevance: 7, note: 'Special Effects Artists and Animators' },
  ],

  'FTU-LSCM': [
    { onetCode: '13-1081.00', relevance: 10, isPrimary: true, note: 'Logisticians' },
    { onetCode: '11-3071.04', relevance: 9, note: 'Supply Chain Managers' },
    { onetCode: '13-1023.00', relevance: 7, note: 'Purchasing Agents, Except Wholesale, Retail, and Farm Products' },
    { onetCode: '13-1082.00', relevance: 6, note: 'Project Management Specialists' },
  ],
  'FTU-IB': [
    { onetCode: '13-1111.00', relevance: 10, isPrimary: true, note: 'Management Analysts' },
    { onetCode: '13-1161.00', relevance: 9, note: 'Market Research Analysts and Marketing Specialists' },
    { onetCode: '13-1082.00', relevance: 8, note: 'Project Management Specialists' },
    { onetCode: '13-1023.00', relevance: 7, note: 'Purchasing Agents, Except Wholesale, Retail, and Farm Products' },
  ],
  'FTU-ACCA': [
    { onetCode: '13-2011.00', relevance: 10, isPrimary: true, note: 'Accountants and Auditors' },
    { onetCode: '13-2061.00', relevance: 9, note: 'Financial Examiners' },
    { onetCode: '13-2031.00', relevance: 8, note: 'Budget Analysts' },
    { onetCode: '13-2081.00', relevance: 7, note: 'Tax Examiners and Collectors, and Revenue Agents' },
  ],
  'FTU-BFIN': [
    { onetCode: '13-2051.00', relevance: 10, isPrimary: true, note: 'Financial and Investment Analysts' },
    { onetCode: '13-2052.00', relevance: 9, note: 'Personal Financial Advisors' },
    { onetCode: '13-2061.00', relevance: 8, note: 'Financial Examiners' },
    { onetCode: '13-2072.00', relevance: 7, note: 'Loan Officers' },
    { onetCode: '11-3031.00', relevance: 6, note: 'Financial Managers' },
  ],
  'FTU-BA': [
    { onetCode: '11-1021.00', relevance: 10, isPrimary: true, note: 'General and Operations Managers' },
    { onetCode: '13-1111.00', relevance: 9, note: 'Management Analysts' },
    { onetCode: '13-1082.00', relevance: 8, note: 'Project Management Specialists' },
    { onetCode: '11-2021.00', relevance: 7, note: 'Marketing Managers' },
  ],
  'FTU-HM': [
    { onetCode: '11-9081.00', relevance: 10, isPrimary: true, note: 'Lodging Managers' },
    { onetCode: '11-9051.00', relevance: 9, note: 'Food Service Managers' },
    { onetCode: '41-3041.00', relevance: 7, note: 'Travel Agents' },
    { onetCode: '43-4181.00', relevance: 6, note: 'Reservation and Transportation Ticket Agents and Travel Clerks' },
  ],
  'FTU-IBL': [
    { onetCode: '23-1011.00', relevance: 10, isPrimary: true, note: 'Lawyers' },
    { onetCode: '23-2011.00', relevance: 9, note: 'Paralegals and Legal Assistants' },
    { onetCode: '13-1041.07', relevance: 8, note: 'Regulatory Affairs Specialists' },
    { onetCode: '11-9199.01', relevance: 7, note: 'Regulatory Affairs Managers' },
  ],
  'NEU-BA': [
    { onetCode: '15-2051.01', relevance: 10, isPrimary: true, note: 'Business Intelligence Analysts' },
    { onetCode: '15-2031.00', relevance: 9, note: 'Operations Research Analysts' },
    { onetCode: '13-1111.00', relevance: 8, note: 'Management Analysts' },
    { onetCode: '13-1082.00', relevance: 6, note: 'Project Management Specialists' },
  ],
  'UEL-ACC': [
    { onetCode: '13-2011.00', relevance: 10, isPrimary: true, note: 'Accountants and Auditors' },
    { onetCode: '13-2061.00', relevance: 8, note: 'Financial Examiners' },
    { onetCode: '13-2031.00', relevance: 7, note: 'Budget Analysts' },
    { onetCode: '13-2081.00', relevance: 6, note: 'Tax Examiners and Collectors, and Revenue Agents' },
  ],
  'UFM-MKT': [
    { onetCode: '13-1161.00', relevance: 10, isPrimary: true, note: 'Market Research Analysts and Marketing Specialists' },
    { onetCode: '11-2021.00', relevance: 9, note: 'Marketing Managers' },
    { onetCode: '27-3031.00', relevance: 7, note: 'Public Relations Specialists' },
    { onetCode: '11-2011.00', relevance: 6, note: 'Advertising and Promotions Managers' },
  ],
  'HCMUSSH-PSY': [
    { onetCode: '19-3033.00', relevance: 10, isPrimary: true, note: 'Clinical and Counseling Psychologists' },
    { onetCode: '19-3034.00', relevance: 9, note: 'School Psychologists' },
    { onetCode: '13-1151.00', relevance: 7, note: 'Training and Development Specialists' },
    { onetCode: '13-1071.00', relevance: 6, note: 'Human Resources Specialists' },
  ],

  'HCMIU-BA': [
    { onetCode: '11-1021.00', relevance: 9, isPrimary: true, note: 'General and Operations Managers' },
    { onetCode: '11-2021.00', relevance: 7, note: 'Marketing Managers' },
  ],
  'HCMIU-MKT': [
    { onetCode: '11-2021.00', relevance: 10, isPrimary: true, note: 'Marketing Managers' },
    { onetCode: '13-1161.00', relevance: 9, note: 'Market Research Analysts and Marketing Specialists' },
  ],
  'HCMIU-ECON': [
    { onetCode: '19-3011.00', relevance: 10, isPrimary: true, note: 'Economists' },
    { onetCode: '13-2031.00', relevance: 8, note: 'Budget Analysts' },
    { onetCode: '13-2051.00', relevance: 6, note: 'Financial and Investment Analysts' },
  ],
  'HCMIU-EL': [
    { onetCode: '27-3091.00', relevance: 10, isPrimary: true, note: 'Interpreters and Translators' },
    { onetCode: '27-3042.00', relevance: 8, note: 'Technical Writers' },
    { onetCode: '25-3011.00', relevance: 7, note: 'English as a Second Language Instructors' },
  ],
  'HCMIU-FT': [
    { onetCode: '19-1012.00', relevance: 10, isPrimary: true, note: 'Food Scientists and Technologists' },
    { onetCode: '19-4013.00', relevance: 8, note: 'Food Science Technicians' },
    { onetCode: '19-4099.01', relevance: 7, note: 'Quality Control Analysts' },
  ],
  'HCMIU-BT': [
    { onetCode: '19-1042.00', relevance: 9, isPrimary: true, note: 'Medical Scientists' },
    { onetCode: '19-1021.00', relevance: 8, note: 'Biochemists and Biophysicists' },
  ],
  'HCMIU-CHEMBIO': [
    { onetCode: '19-1021.00', relevance: 10, isPrimary: true, note: 'Biochemists and Biophysicists' },
    { onetCode: '19-1042.00', relevance: 8, note: 'Medical Scientists' },
  ],
  'HCMIU-ENV': [
    { onetCode: '17-2081.00', relevance: 10, isPrimary: true, note: 'Environmental Engineers' },
    { onetCode: '19-2041.00', relevance: 8, note: 'Environmental Scientists and Specialists' },
  ],
  'HCMIU-ACC': [
    { onetCode: '13-2011.00', relevance: 10, isPrimary: true, note: 'Accountants and Auditors' },
    { onetCode: '13-2031.00', relevance: 8, note: 'Budget Analysts' },
    { onetCode: '13-2051.00', relevance: 6, note: 'Financial and Investment Analysts' },
  ],
  'HCMIU-ISE': [
    { onetCode: '17-2112.00', relevance: 10, isPrimary: true, note: 'Industrial Engineers' },
    { onetCode: '15-2031.00', relevance: 8, note: 'Operations Research Analysts' },
    { onetCode: '13-1081.00', relevance: 7, note: 'Logisticians' },
  ],
  'HCMIU-LSCM2': [
    { onetCode: '11-3071.00', relevance: 9, isPrimary: true, note: 'Transportation, Storage, and Distribution Managers' },
    { onetCode: '13-1081.00', relevance: 9, note: 'Logisticians' },
  ],

  'UIC-BBA': [
    { onetCode: '11-1021.00', relevance: 9, isPrimary: true, note: 'General and Operations Managers' },
    { onetCode: '13-1111.00', relevance: 8, note: 'Management Analysts' },
    { onetCode: '11-2021.00', relevance: 7, note: 'Marketing Managers' },
  ],
  'UNCC-DS': [
    { onetCode: '15-2051.00', relevance: 10, isPrimary: true, note: 'Data Scientists' },
    { onetCode: '15-2041.00', relevance: 8, note: 'Statisticians' },
    { onetCode: '15-2031.00', relevance: 6, note: 'Operations Research Analysts' },
  ],
  'UNCC-CPE-ML': [
    { onetCode: '17-2061.00', relevance: 9, isPrimary: true, note: 'Computer Hardware Engineers' },
    { onetCode: '15-1221.00', relevance: 8, note: 'Computer and Information Research Scientists' },
    { onetCode: '15-1252.00', relevance: 7, note: 'Software Developers' },
  ],

  'HCMIU-ETE': [
    { onetCode: '17-2071.00', relevance: 10, isPrimary: true, note: 'Electrical Engineers' },
    { onetCode: '17-2072.00', relevance: 9, note: 'Electronics Engineers, Except Computer' },
    { onetCode: '27-3042.00', relevance: 7, note: 'Technical Writers' },
  ],
  'HCMIU-STAT': [
    { onetCode: '15-2041.00', relevance: 10, isPrimary: true, note: 'Statisticians' },
    { onetCode: '15-2031.00', relevance: 8, note: 'Operations Research Analysts' },
    { onetCode: '15-2051.00', relevance: 7, note: 'Data Scientists' },
  ],

  'USTH-ICT-DD': [
    { onetCode: '15-1252.00', relevance: 9, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1211.00', relevance: 8, note: 'Computer Systems Analysts' },
    { onetCode: '15-1299.09', relevance: 7, note: 'Information Technology Project Managers' },
  ],

  'HCMIU-IT': [
    { onetCode: '15-1252.00', relevance: 9, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1232.00', relevance: 8, note: 'Computer User Support Specialists' },
    { onetCode: '15-1244.00', relevance: 8, note: 'Network and Computer Systems Administrators' },
  ],
  'HCMIU-CS': [
    { onetCode: '15-1252.00', relevance: 9, isPrimary: true, note: 'Software Developers' },
    { onetCode: '15-1221.00', relevance: 8, note: 'Computer and Information Research Scientists' },
    { onetCode: '15-1299.08', relevance: 8, note: 'Computer Systems Engineers/Architects' },
  ],
  'HCMIU-DS': [
    { onetCode: '15-2051.00', relevance: 9, isPrimary: true, note: 'Data Scientists' },
    { onetCode: '15-2041.00', relevance: 8, note: 'Statisticians' },
    { onetCode: '15-1243.01', relevance: 7, note: 'Data Warehousing Specialists' },
  ],

  'HCMIU-CM': [
    { onetCode: '11-9021.00', relevance: 10, isPrimary: true, note: 'Construction Managers' },
    { onetCode: '13-1082.00', relevance: 8, note: 'Project Management Specialists' },
    { onetCode: '13-2011.00', relevance: 5, note: 'Accountants and Auditors' },
  ],
  'HCMIU-CVE': [
    { onetCode: '17-2051.00', relevance: 10, isPrimary: true, note: 'Civil Engineers' },
    { onetCode: '17-2051.01', relevance: 7, note: 'Transportation Engineers' },
    { onetCode: '17-1022.00', relevance: 5, note: 'Surveyors' },
  ],
  'HCMIU-AE': [
    { onetCode: '17-2011.00', relevance: 10, isPrimary: true, note: 'Aerospace Engineers' },
    { onetCode: '17-3021.00', relevance: 6, note: 'Aerospace Engineering and Operations Technologists and Technicians' },
    { onetCode: '17-2141.00', relevance: 5, note: 'Mechanical Engineers' },
  ],
  'HCMIU-SPACE': [
    { onetCode: '17-2011.00', relevance: 10, isPrimary: true, note: 'Aerospace Engineers' },
    { onetCode: '17-2199.00', relevance: 7, note: 'Engineers, All Other' },
    { onetCode: '19-2012.00', relevance: 5, note: 'Physicists' },
  ],

  'HCMIU-FB': [
    { onetCode: '13-2051.00', relevance: 10, isPrimary: true, note: 'Financial and Investment Analysts' },
    { onetCode: '13-2061.00', relevance: 8, note: 'Financial Examiners' },
    { onetCode: '11-3031.00', relevance: 7, note: 'Financial Managers' },
  ],
  'HCMIU-AM': [
    { onetCode: '15-2021.00', relevance: 10, isPrimary: true, note: 'Mathematicians' },
    { onetCode: '15-2041.00', relevance: 8, note: 'Statisticians' },
    { onetCode: '15-2051.00', relevance: 7, note: 'Data Scientists' },
  ],

  'IMTC-IM': [
    { onetCode: '49-9041.00', relevance: 10, isPrimary: true, note: 'Industrial Machinery Mechanics' },
    { onetCode: '49-9071.00', relevance: 8, note: 'Maintenance and Repair Workers, General' },
    { onetCode: '49-2094.00', relevance: 6, note: 'Electrical and Electronics Repairers, Commercial and Industrial Equipment' },
  ],

  'IUH-GFT': [
    { onetCode: '11-3051.00', relevance: 10, isPrimary: true, note: 'Industrial Production Managers' },
    { onetCode: '51-6052.00', relevance: 8, note: 'Tailors, Dressmakers, and Custom Sewers' },
    { onetCode: '27-1022.00', relevance: 6, note: 'Fashion Designers' },
  ],

  'HCMUT-PE': [
    { onetCode: '17-2171.00', relevance: 10, isPrimary: true, note: 'Petroleum Engineers' },
    { onetCode: '19-2042.00', relevance: 7, note: 'Geoscientists, Except Hydrologists and Geographers' },
    { onetCode: '17-2199.00', relevance: 5, note: 'Engineers, All Other' },
  ],
  'HCMUT-CHE': [
    { onetCode: '17-2041.00', relevance: 10, isPrimary: true, note: 'Chemical Engineers' },
    { onetCode: '19-2031.00', relevance: 8, note: 'Chemists' },
    { onetCode: '19-4099.01', relevance: 6, note: 'Quality Control Analysts' },
  ],
  'HCMUT-CAE': [
    { onetCode: '17-2071.00', relevance: 10, isPrimary: true, note: 'Electrical Engineers' },
    { onetCode: '17-2072.00', relevance: 8, note: 'Electronics Engineers, Except Computer' },
    { onetCode: '17-2112.00', relevance: 6, note: 'Industrial Engineers' },
  ],
  'HCMUT-NE': [
    { onetCode: '17-2161.00', relevance: 10, isPrimary: true, note: 'Nuclear Engineers' },
    { onetCode: '19-2012.00', relevance: 8, note: 'Physicists' },
    { onetCode: '29-2034.00', relevance: 5, note: 'Radiologic Technologists and Technicians' },
  ],
  'HCMUT-SEMI': [
    { onetCode: '17-2072.00', relevance: 10, isPrimary: true, note: 'Electronics Engineers, Except Computer' },
    { onetCode: '17-2071.00', relevance: 7, note: 'Electrical Engineers' },
    { onetCode: '17-2112.00', relevance: 5, note: 'Industrial Engineers' },
  ],
};

async function main() {
  const allOnet = await prisma.onetOccupation.findMany({ select: { id: true, onetCode: true } });
  const onetMap = new Map(allOnet.map((o) => [o.onetCode, o.id]));

  const allPrograms = await prisma.program.findMany({ where: { status: 'ACTIVE' }, select: { id: true, code: true } });
  const progMap = new Map(allPrograms.map((p) => [p.code, p.id]));

  let created = 0;
  let skipped = 0;
  let missing = 0;

  for (const [progCode, links] of Object.entries(PROGRAM_ONET_MAP)) {
    const programId = progMap.get(progCode);
    if (!programId) {
      console.warn(`Program ${progCode} not found in DB — skipping`);
      missing++;
      continue;
    }

    for (const link of links) {
      const occupationId = onetMap.get(link.onetCode);
      if (!occupationId) {
        console.warn(`O*NET ${link.onetCode} (${link.note}) not found in DB — skipping`);
        missing++;
        continue;
      }

      try {
        await prisma.programOnetLink.upsert({
          where: { programId_occupationId: { programId, occupationId } },
          update: { relevance: link.relevance, isPrimary: link.isPrimary || false, note: link.note || null },
          create: {
            programId,
            occupationId,
            relevance: link.relevance,
            isPrimary: link.isPrimary || false,
            note: link.note || null,
          },
        });
        created++;
      } catch (err) {
        console.error(`Failed to link ${progCode} → ${link.onetCode}: ${err.message}`);
        skipped++;
      }
    }
  }

  console.log(`\n=== O*NET Links ===`);
  console.log(`Created/updated: ${created}`);
  console.log(`Skipped (errors): ${skipped}`);
  console.log(`Missing (not in DB): ${missing}`);

  const total = await prisma.programOnetLink.count();
  console.log(`Total links in DB: ${total}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
