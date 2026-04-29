"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, BrainCircuit, BriefcaseBusiness, Flag, GitBranch, GraduationCap, Route, ShieldAlert, Swords, Zap } from "lucide-react";
import { MetricTile, Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { useLanguage } from "@/components/language-provider";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Level = "low" | "medium" | "high";
type PathId = "safe" | "growth" | "credential";

type CareerTemplate = {
  roleKo: string;
  roleEn: string;
  entryKo: string[];
  entryEn: string[];
  skillsKo: string[];
  skillsEn: string[];
  projectsKo: string[];
  projectsEn: string[];
  risksKo: string[];
  risksEn: string[];
  interviewKo: string[];
  interviewEn: string[];
  planKo: string[];
  planEn: string[];
};

type CareerPathResult = {
  id: PathId;
  title: string;
  fitLevel: Level;
  riskLevel: Level;
  timeline: string[];
  pros: string[];
  cons: string[];
  bestFor: string;
  mainBottleneck: string;
  nextMove: string;
};

type DecisionCard = {
  id: string;
  title: string;
  riskImpact: string;
  timelineImpact: string;
  skillGapImpact: string;
  nextAction: string;
};

type RiskEvent = {
  title: string;
  description: string;
  impact: string;
  prevention: string;
};

type ChessResult = {
  sourceNote?: string;
  summary: string;
  recommendedPath: string;
  paths: CareerPathResult[];
  parallelTimelines: string[];
  decisionCards: DecisionCard[];
  riskEvents: RiskEvent[];
  skillGaps: string[];
  ninetyDayPlan: string[];
  source?: "openai" | "demo_fallback";
  evaluationId?: string | null;
};

const roleTemplates: CareerTemplate[] = [
  {
    roleKo: "소프트웨어 엔지니어",
    roleEn: "Software Engineer",
    entryKo: ["주니어 개발자", "프론트엔드 인턴", "QA 자동화 보조"],
    entryEn: ["Junior Developer", "Frontend Intern", "QA Automation Assistant"],
    skillsKo: ["자료구조 기초", "Git", "웹/API", "디버깅"],
    skillsEn: ["Data structures basics", "Git", "Web/API", "Debugging"],
    projectsKo: ["CRUD 앱", "API 연동 대시보드", "테스트가 있는 포트폴리오"],
    projectsEn: ["CRUD app", "API dashboard", "Tested portfolio project"],
    risksKo: ["기술 깊이 부족", "프로젝트 설명 약함", "면접 알고리즘 불안"],
    risksEn: ["Weak technical depth", "Weak project story", "Algorithm interview anxiety"],
    interviewKo: ["문제 해결", "디버깅", "기술 선택 이유"],
    interviewEn: ["Problem solving", "Debugging", "Technical rationale"],
    planKo: ["프로젝트 1개 배포", "모의 기술면접 5회", "공고 키워드 30개 정리"],
    planEn: ["Ship one project", "Run 5 mock technical interviews", "Map 30 job keywords"],
  },
  {
    roleKo: "데이터 분석가",
    roleEn: "Data Analyst",
    entryKo: ["데이터 인턴", "리포팅 어시스턴트", "BI 주니어"],
    entryEn: ["Data Intern", "Reporting Assistant", "Junior BI Analyst"],
    skillsKo: ["SQL", "스프레드시트", "시각화", "지표 해석"],
    skillsEn: ["SQL", "Spreadsheets", "Visualization", "Metric interpretation"],
    projectsKo: ["매출 대시보드", "이탈 분석", "공개 데이터 인사이트 리포트"],
    projectsEn: ["Revenue dashboard", "Churn analysis", "Public data insight report"],
    risksKo: ["비즈니스 해석 약함", "SQL 증거 부족", "결론이 모호함"],
    risksEn: ["Weak business interpretation", "Limited SQL proof", "Vague conclusions"],
    interviewKo: ["지표 정의", "가설", "분석 한계"],
    interviewEn: ["Metric definition", "Hypotheses", "Analysis caveats"],
    planKo: ["SQL 50문제", "대시보드 1개", "분석 리포트 2개 작성"],
    planEn: ["Solve 50 SQL questions", "Build one dashboard", "Write 2 analysis reports"],
  },
  {
    roleKo: "UI/UX 디자이너",
    roleEn: "UI/UX Designer",
    entryKo: ["UX 인턴", "주니어 프로덕트 디자이너", "디자인 어시스턴트"],
    entryEn: ["UX Intern", "Junior Product Designer", "Design Assistant"],
    skillsKo: ["Figma", "사용자 리서치", "와이어프레임", "프로토타입"],
    skillsEn: ["Figma", "User research", "Wireframes", "Prototyping"],
    projectsKo: ["앱 리디자인", "사용성 개선 케이스", "디자인 시스템 일부"],
    projectsEn: ["App redesign", "Usability case study", "Small design system"],
    risksKo: ["예쁜 화면만 강조", "사용자 근거 부족", "프로세스 설명 약함"],
    risksEn: ["Overfocus on visuals", "Weak user evidence", "Weak process explanation"],
    interviewKo: ["사용자 공감", "디자인 근거", "반복 개선"],
    interviewEn: ["User empathy", "Design rationale", "Iteration"],
    planKo: ["케이스스터디 1개 완성", "사용자 5명 피드백", "포트폴리오 스토리 정리"],
    planEn: ["Finish 1 case study", "Get 5 user feedback sessions", "Write portfolio narrative"],
  },
  {
    roleKo: "프로덕트 매니저",
    roleEn: "Product Manager",
    entryKo: ["PM 인턴", "프로덕트 오퍼레이션", "비즈니스 분석가"],
    entryEn: ["PM Intern", "Product Operations", "Business Analyst"],
    skillsKo: ["문제 정의", "우선순위", "지표", "커뮤니케이션"],
    skillsEn: ["Problem framing", "Prioritization", "Metrics", "Communication"],
    projectsKo: ["기능 제안서", "경쟁사 분석", "실험 설계 문서"],
    projectsEn: ["Feature proposal", "Competitor analysis", "Experiment plan"],
    risksKo: ["실무 경험 부족", "지표 사고 약함", "추상적 답변"],
    risksEn: ["Limited product experience", "Weak metric thinking", "Abstract answers"],
    interviewKo: ["제품 감각", "우선순위", "사용자 문제"],
    interviewEn: ["Product sense", "Prioritization", "User problems"],
    planKo: ["제품 분석 3개", "PRD 1개", "PM 모의면접 3회"],
    planEn: ["Analyze 3 products", "Write 1 PRD", "Run 3 PM mock interviews"],
  },
  {
    roleKo: "디지털 마케터",
    roleEn: "Digital Marketer",
    entryKo: ["마케팅 인턴", "콘텐츠 마케팅 보조", "퍼포먼스 마케팅 주니어"],
    entryEn: ["Marketing Intern", "Content Marketing Assistant", "Junior Performance Marketer"],
    skillsKo: ["콘텐츠", "광고 지표", "SEO", "캠페인 기획"],
    skillsEn: ["Content", "Ad metrics", "SEO", "Campaign planning"],
    projectsKo: ["캠페인 기획서", "SEO 글 5개", "광고 성과 분석"],
    projectsEn: ["Campaign plan", "5 SEO posts", "Ad performance analysis"],
    risksKo: ["성과 지표 부족", "타깃 정의 약함", "채널 이해 부족"],
    risksEn: ["Few performance metrics", "Weak audience definition", "Limited channel knowledge"],
    interviewKo: ["타깃", "채널", "성과 지표"],
    interviewEn: ["Audience", "Channels", "Performance metrics"],
    planKo: ["콘텐츠 5개 제작", "GA4 기초 학습", "캠페인 분석 2개"],
    planEn: ["Create 5 content pieces", "Learn GA4 basics", "Analyze 2 campaigns"],
  },
  {
    roleKo: "비즈니스 분석가",
    roleEn: "Business Analyst",
    entryKo: ["BA 인턴", "전략/운영 어소시에이트", "리서치 어시스턴트"],
    entryEn: ["BA Intern", "Strategy/Ops Associate", "Research Assistant"],
    skillsKo: ["문제 구조화", "Excel", "리서치", "문서화"],
    skillsEn: ["Problem structuring", "Excel", "Research", "Documentation"],
    projectsKo: ["시장 분석", "운영 개선 제안", "매출 하락 원인 분석"],
    projectsEn: ["Market analysis", "Ops improvement proposal", "Revenue drop analysis"],
    risksKo: ["문제 정의 모호", "분석 근거 부족", "발표 구조 약함"],
    risksEn: ["Vague problem framing", "Weak evidence", "Weak presentation structure"],
    interviewKo: ["구조화", "가설", "이해관계자 소통"],
    interviewEn: ["Structuring", "Hypotheses", "Stakeholder communication"],
    planKo: ["케이스 5개 풀이", "Excel 모델 1개", "산업 리서치 2개"],
    planEn: ["Solve 5 cases", "Build 1 Excel model", "Research 2 industries"],
  },
  {
    roleKo: "HR 코디네이터",
    roleEn: "HR Coordinator",
    entryKo: ["HR 인턴", "채용 운영 보조", "교육 운영 보조"],
    entryEn: ["HR Intern", "Recruiting Coordinator", "Learning Ops Assistant"],
    skillsKo: ["커뮤니케이션", "일정 조율", "문서 정리", "전문성"],
    skillsEn: ["Communication", "Scheduling", "Documentation", "Professionalism"],
    projectsKo: ["채용 프로세스 개선안", "온보딩 체크리스트", "교육 운영 문서"],
    projectsEn: ["Recruiting process improvement", "Onboarding checklist", "Training ops doc"],
    risksKo: ["사무 경험 부족", "민감정보 태도 미흡", "정리력 증거 부족"],
    risksEn: ["Limited office experience", "Weak discretion examples", "Weak organization proof"],
    interviewKo: ["전문성", "정리력", "협업"],
    interviewEn: ["Professionalism", "Organization", "Teamwork"],
    planKo: ["일정 조율 사례 정리", "HR 용어 학습", "STAR 스토리 3개"],
    planEn: ["Prepare scheduling examples", "Study HR terms", "Prepare 3 STAR stories"],
  },
  {
    roleKo: "재무 분석가",
    roleEn: "Finance Analyst",
    entryKo: ["재무 인턴", "회계 보조", "FP&A 주니어"],
    entryEn: ["Finance Intern", "Accounting Assistant", "Junior FP&A"],
    skillsKo: ["Excel", "재무제표", "예산", "정확성"],
    skillsEn: ["Excel", "Financial statements", "Budgeting", "Accuracy"],
    projectsKo: ["3개 기업 재무 비교", "예산 추적 모델", "비용 초과 분석"],
    projectsEn: ["3-company financial comparison", "Budget tracker", "Cost variance analysis"],
    risksKo: ["숫자 해석 약함", "실수 리스크", "비즈니스 연결 부족"],
    risksEn: ["Weak number interpretation", "Accuracy risk", "Weak business connection"],
    interviewKo: ["정확성", "가정", "리스크"],
    interviewEn: ["Accuracy", "Assumptions", "Risk"],
    planKo: ["Excel 모델 1개", "재무제표 분석 2개", "회계 기초 복습"],
    planEn: ["Build 1 Excel model", "Analyze 2 financial statements", "Review accounting basics"],
  },
  {
    roleKo: "운영 어소시에이트",
    roleEn: "Operations Associate",
    entryKo: ["운영 인턴", "오퍼레이션 코디네이터", "프로세스 어시스턴트"],
    entryEn: ["Operations Intern", "Operations Coordinator", "Process Assistant"],
    skillsKo: ["정확성", "우선순위", "프로세스 개선", "협업"],
    skillsEn: ["Accuracy", "Prioritization", "Process improvement", "Collaboration"],
    projectsKo: ["업무 체크리스트", "반복 실수 개선안", "운영 지표 대시보드"],
    projectsEn: ["Workflow checklist", "Mistake reduction plan", "Ops metrics dashboard"],
    risksKo: ["성과가 추상적", "우선순위 설명 약함", "도구 경험 부족"],
    risksEn: ["Abstract impact", "Weak prioritization examples", "Limited tool experience"],
    interviewKo: ["정확성", "프로세스", "속도"],
    interviewEn: ["Accuracy", "Process", "Pace"],
    planKo: ["프로세스 개선 사례 정리", "Excel/Notion 운영표 제작", "공고 20개 지원"],
    planEn: ["Document a process improvement", "Build Excel/Notion tracker", "Apply to 20 roles"],
  },
  {
    roleKo: "사이버보안 분석가",
    roleEn: "Cybersecurity Analyst",
    entryKo: ["SOC 인턴", "보안 관제 보조", "IT 보안 주니어"],
    entryEn: ["SOC Intern", "Security Monitoring Assistant", "Junior IT Security"],
    skillsKo: ["네트워크 기초", "로그 분석", "리스크", "보고"],
    skillsEn: ["Networking basics", "Log analysis", "Risk", "Reporting"],
    projectsKo: ["홈랩", "로그 분석 리포트", "피싱 대응 플레이북"],
    projectsEn: ["Home lab", "Log analysis report", "Phishing response playbook"],
    risksKo: ["실습 증거 부족", "기초 개념 약함", "과장된 보안 지식"],
    risksEn: ["Limited hands-on proof", "Weak fundamentals", "Overstated security knowledge"],
    interviewKo: ["조사 절차", "윤리", "리스크 우선순위"],
    interviewEn: ["Investigation process", "Ethics", "Risk priority"],
    planKo: ["보안 홈랩 구축", "로그 분석 2건", "기초 자격 1개 준비"],
    planEn: ["Build a security home lab", "Analyze 2 log cases", "Prepare 1 basic cert"],
  },
  {
    roleKo: "QA 엔지니어",
    roleEn: "QA Engineer",
    entryKo: ["QA 인턴", "테스터", "테스트 자동화 주니어"],
    entryEn: ["QA Intern", "Tester", "Junior Test Automation"],
    skillsKo: ["테스트 케이스", "버그 리포트", "재현 절차", "기초 자동화"],
    skillsEn: ["Test cases", "Bug reports", "Reproduction", "Basic automation"],
    projectsKo: ["앱 테스트 플랜", "버그 리포트 샘플", "간단 자동화 테스트"],
    projectsEn: ["App test plan", "Bug report samples", "Simple automated tests"],
    risksKo: ["개발 이해 부족", "테스트 근거 약함", "문서화 부족"],
    risksEn: ["Weak development understanding", "Weak test rationale", "Poor documentation"],
    interviewKo: ["꼼꼼함", "재현성", "우선순위"],
    interviewEn: ["Precision", "Reproducibility", "Priority"],
    planKo: ["테스트 케이스 30개", "버그 리포트 5개", "자동화 예제 1개"],
    planEn: ["Write 30 test cases", "Write 5 bug reports", "Create 1 automation sample"],
  },
  {
    roleKo: "고객 성공 어소시에이트",
    roleEn: "Customer Success Associate",
    entryKo: ["CS 인턴", "고객 지원", "온보딩 어시스턴트"],
    entryEn: ["CS Intern", "Customer Support", "Onboarding Assistant"],
    skillsKo: ["공감", "문제 해결", "제품 이해", "후속 조치"],
    skillsEn: ["Empathy", "Problem solving", "Product understanding", "Follow-up"],
    projectsKo: ["고객 응대 스크립트", "FAQ 개선", "온보딩 체크리스트"],
    projectsEn: ["Support scripts", "FAQ improvement", "Onboarding checklist"],
    risksKo: ["제품 이해 부족", "감정 대응 약함", "성과 수치 부족"],
    risksEn: ["Weak product understanding", "Weak emotional handling", "Few metrics"],
    interviewKo: ["공감", "문제 해결", "커뮤니케이션"],
    interviewEn: ["Empathy", "Problem solving", "Communication"],
    planKo: ["고객 사례 3개 준비", "제품 분석 1개", "응대 스크립트 작성"],
    planEn: ["Prepare 3 customer stories", "Analyze 1 product", "Write support scripts"],
  },
  {
    roleKo: "세일즈 개발 담당자",
    roleEn: "Sales Development Representative",
    entryKo: ["SDR", "영업 인턴", "비즈니스 개발 주니어"],
    entryEn: ["SDR", "Sales Intern", "Junior Business Development"],
    skillsKo: ["리서치", "설득", "거절 대응", "자신감"],
    skillsEn: ["Research", "Persuasion", "Objection handling", "Confidence"],
    projectsKo: ["아웃바운드 메일 10개", "고객 페르소나 분석", "세일즈 스크립트"],
    projectsEn: ["10 outbound emails", "Customer persona analysis", "Sales script"],
    risksKo: ["거절 대응 약함", "리서치 부족", "성과 경험 부족"],
    risksEn: ["Weak objection handling", "Weak research", "Limited performance examples"],
    interviewKo: ["자신감", "설득", "회복탄력성"],
    interviewEn: ["Confidence", "Persuasion", "Resilience"],
    planKo: ["콜드메일 10개 작성", "거절 대응 답변 5개", "CRM 기초 학습"],
    planEn: ["Write 10 cold emails", "Prepare 5 objection responses", "Learn CRM basics"],
  },
  {
    roleKo: "콘텐츠 전략가",
    roleEn: "Content Strategist",
    entryKo: ["콘텐츠 인턴", "에디터 보조", "브랜드 콘텐츠 주니어"],
    entryEn: ["Content Intern", "Editorial Assistant", "Junior Brand Content"],
    skillsKo: ["독자 이해", "메시지 구조", "편집", "SEO"],
    skillsEn: ["Audience insight", "Message structure", "Editing", "SEO"],
    projectsKo: ["콘텐츠 캘린더", "SEO 글 5개", "브랜드 톤 가이드"],
    projectsEn: ["Content calendar", "5 SEO posts", "Brand tone guide"],
    risksKo: ["성과 지표 부족", "타깃 모호", "포트폴리오 산만"],
    risksEn: ["Few performance metrics", "Vague audience", "Scattered portfolio"],
    interviewKo: ["독자", "톤", "편집 판단"],
    interviewEn: ["Audience", "Tone", "Editorial judgment"],
    planKo: ["글 5개 발행", "성과 지표 기록", "포트폴리오 카테고리 정리"],
    planEn: ["Publish 5 posts", "Track performance metrics", "Organize portfolio categories"],
  },
  {
    roleKo: "IT 지원 담당자",
    roleEn: "IT Support Specialist",
    entryKo: ["IT 헬프데스크", "기술지원 인턴", "시스템 운영 보조"],
    entryEn: ["IT Help Desk", "Technical Support Intern", "Systems Ops Assistant"],
    skillsKo: ["문제 분리", "네트워크 기초", "문서화", "고객 응대"],
    skillsEn: ["Troubleshooting", "Networking basics", "Documentation", "User support"],
    projectsKo: ["장애 대응 체크리스트", "FAQ 문서", "홈 네트워크 진단"],
    projectsEn: ["Incident checklist", "FAQ docs", "Home network diagnosis"],
    risksKo: ["기초 개념 부족", "고객 응대 약함", "문서화 부족"],
    risksEn: ["Weak fundamentals", "Weak user communication", "Poor documentation"],
    interviewKo: ["침착함", "문제 해결 순서", "쉬운 설명"],
    interviewEn: ["Calmness", "Troubleshooting sequence", "Plain explanation"],
    planKo: ["기술지원 사례 3개", "네트워크 기초 복습", "문서 샘플 2개 작성"],
    planEn: ["Prepare 3 support scenarios", "Review networking basics", "Write 2 doc samples"],
  },
];

const copy = {
  ko: {
    eyebrow: "커리어 전략 게임",
    title: "Career Chess",
    description: "복잡한 확률 대신 세 가지 현실 경로, 리스크, 그리고 90일 액션 플랜을 보여드립니다.",
    snapshot: "커리어 스냅샷",
    snapshotDesc: "현재 상태를 입력하면 Safe/Growth/Credential 세 경로를 비교합니다.",
    currentStatus: "현재 상태",
    majorBackground: "전공/배경",
    currentSkills: "현재 기술",
    experienceLevel: "경험 수준",
    targetRole: "목표 직무",
    targetCompanyType: "목표 회사 유형",
    timeline: "희망 타임라인",
    riskTolerance: "리스크 감수",
    careerPriority: "커리어 우선순위",
    simulate: "전략 시뮬레이션",
    simulating: "전략 계산 중...",
    template: "직무 템플릿",
    templateDesc: "선택한 직무의 입문 경로와 준비 포인트입니다.",
    paths: "세 가지 경로",
    timelineView: "병렬 타임라인",
    decisions: "What-if 의사결정",
    risks: "리스크 이벤트",
    plan: "90일 액션 플랜",
    gaps: "핵심 스킬 갭",
    empty: "스냅샷을 입력하고 전략 시뮬레이션을 실행하면 커리어 체스판이 열립니다.",
    summary: "전략 요약",
    recommended: "추천 경로",
    fit: "적합도",
    risk: "리스크",
    pros: "장점",
    cons: "단점",
    bestFor: "추천 대상",
    bottleneck: "병목",
    nextMove: "다음 수",
    impact: "영향",
    prevention: "예방 액션",
    source: "결과 상태",
    saved: "저장됨",
    demo: "데모",
    error: "시뮬레이션을 완료하지 못했습니다.",
    levels: { low: "낮음", medium: "중간", high: "높음" },
    priorities: ["안정적 취업 우선", "가장 빠른 성장", "최고 연봉", "워라밸", "글로벌/미국 커리어", "포트폴리오 중심 경로"],
    targetTypes: ["대기업", "스타트업", "중견/중소", "공공/비영리", "글로벌/미국", "상관없음"],
    experience: ["학생", "신입", "인턴", "1년 미만", "직무 전환자"],
  },
  en: {
    eyebrow: "Career Strategy Game",
    title: "Career Chess",
    description: "Skip fake probabilities. Compare three practical routes, risks, and your next 90 days.",
    snapshot: "Career Snapshot",
    snapshotDesc: "Share your current situation to compare Safe, Growth, and Credential routes.",
    currentStatus: "Current status",
    majorBackground: "Major / background",
    currentSkills: "Current skills",
    experienceLevel: "Experience level",
    targetRole: "Target role",
    targetCompanyType: "Target company type",
    timeline: "Timeline",
    riskTolerance: "Risk tolerance",
    careerPriority: "Career priority",
    simulate: "Simulate Strategy",
    simulating: "Calculating strategy...",
    template: "Role Template",
    templateDesc: "Entry points and preparation signals for the selected role.",
    paths: "Three Path Simulator",
    timelineView: "Parallel Timeline",
    decisions: "What-if Decisions",
    risks: "Risk Events",
    plan: "90-Day Action Plan",
    gaps: "Core Skill Gaps",
    empty: "Fill the snapshot and run the strategy simulation to open the Career Chess board.",
    summary: "Strategy Summary",
    recommended: "Recommended path",
    fit: "Fit",
    risk: "Risk",
    pros: "Pros",
    cons: "Cons",
    bestFor: "Best for",
    bottleneck: "Bottleneck",
    nextMove: "Next move",
    impact: "Impact",
    prevention: "Prevention",
    source: "Result status",
    saved: "Saved",
    demo: "Demo",
    error: "Could not complete simulation.",
    levels: { low: "Low", medium: "Medium", high: "High" },
    priorities: ["stable job first", "fastest growth", "highest salary", "work-life balance", "global/US career", "portfolio-driven path"],
    targetTypes: ["Large company", "Startup", "SMB", "Public/nonprofit", "Global/US", "Flexible"],
    experience: ["Student", "New graduate", "Intern", "Under 1 year", "Career switcher"],
  },
};

const experienceOptions = [
  { value: "student", ko: "학생", en: "Student" },
  { value: "new_grad", ko: "신입", en: "New graduate" },
  { value: "intern", ko: "인턴", en: "Intern" },
  { value: "under_1_year", ko: "1년 미만", en: "Under 1 year" },
  { value: "career_switcher", ko: "직무 전환자", en: "Career switcher" },
];

const companyTypeOptions = [
  { value: "large_company", ko: "대기업", en: "Large company" },
  { value: "startup", ko: "스타트업", en: "Startup" },
  { value: "smb", ko: "중견/중소", en: "SMB" },
  { value: "public_nonprofit", ko: "공공/비영리", en: "Public/nonprofit" },
  { value: "global_us", ko: "글로벌/미국", en: "Global/US" },
  { value: "flexible", ko: "상관없음", en: "Flexible" },
];

const priorityOptions = [
  { value: "stable", ko: "안정적 취업 우선", en: "stable job first" },
  { value: "growth", ko: "가장 빠른 성장", en: "fastest growth" },
  { value: "salary", ko: "최고 연봉", en: "highest salary" },
  { value: "balance", ko: "워라밸", en: "work-life balance" },
  { value: "global", ko: "글로벌/미국 커리어", en: "global/US career" },
  { value: "portfolio", ko: "포트폴리오 중심 경로", en: "portfolio-driven path" },
];

function levelClass(level: Level) {
  if (level === "low") return "border-[color-mix(in_srgb,var(--success)_40%,var(--line))] text-[var(--success)]";
  if (level === "medium") return "border-[color-mix(in_srgb,var(--warning)_42%,var(--line))] text-[var(--warning)]";
  return "border-[color-mix(in_srgb,var(--danger)_42%,var(--line))] text-[var(--danger)]";
}

function pathIcon(id: PathId) {
  if (id === "safe") return ShieldAlert;
  if (id === "growth") return Zap;
  return GraduationCap;
}

export default function CareerChessPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const t = copy[language];
  const [currentStatus, setCurrentStatus] = useState(isEn ? "New graduate" : "신입");
  const [majorBackground, setMajorBackground] = useState("");
  const [currentSkills, setCurrentSkills] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("new_grad");
  const [targetRoleId, setTargetRoleId] = useState("Software Engineer");
  const [targetCompanyType, setTargetCompanyType] = useState("large_company");
  const [timeline, setTimeline] = useState(isEn ? "12 months" : "12개월");
  const [riskTolerance, setRiskTolerance] = useState<Level>("medium");
  const [careerPriority, setCareerPriority] = useState("stable");
  const [result, setResult] = useState<ChessResult | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<PathId>("safe");
  const [selectedDecisionId, setSelectedDecisionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedTemplate = useMemo(
    () => roleTemplates.find((template) => template.roleEn === targetRoleId) ?? roleTemplates[0],
    [targetRoleId],
  );
  const targetRole = isEn ? selectedTemplate.roleEn : selectedTemplate.roleKo;
  const selectedExperience = experienceOptions.find((option) => option.value === experienceLevel);
  const selectedCompanyType = companyTypeOptions.find((option) => option.value === targetCompanyType);
  const selectedPriority = priorityOptions.find((option) => option.value === careerPriority);
  const selectedPath = result?.paths.find((path) => path.id === selectedPathId) ?? result?.paths[0];
  const selectedDecision = result?.decisionCards.find((decision) => decision.id === selectedDecisionId) ?? result?.decisionCards[0];

  const applyTemplate = (roleId: string) => {
    setTargetRoleId(roleId);
    const template = roleTemplates.find((item) => item.roleEn === roleId);
    if (template) {
      setCurrentSkills((isEn ? template.skillsEn : template.skillsKo).slice(0, 4).join(", "));
    }
  };

  const simulate = async () => {
    setLoading(true);
    setError("");
    try {
      const session = supabase && isSupabaseConfigured ? (await supabase.auth.getSession()).data.session : null;
      const response = await fetch("/api/evaluate/career-chess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          currentStatus,
          majorBackground,
          currentSkills,
          experienceLevel: isEn ? selectedExperience?.en : selectedExperience?.ko,
          targetRole,
          targetCompanyType: isEn ? selectedCompanyType?.en : selectedCompanyType?.ko,
          timeline,
          riskTolerance,
          careerPriority: isEn ? selectedPriority?.en : selectedPriority?.ko,
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || t.error);
      setResult(data);
      setSelectedPathId((data.paths?.[0]?.id as PathId) ?? "safe");
      setSelectedDecisionId(data.decisionCards?.[0]?.id ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell maxWidth="max-w-7xl">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <section className="readable-grid-2">
        <PagePanel>
          <SectionTitle title={t.snapshot} description={t.snapshotDesc} />
          <div className="mt-5 grid gap-4">
            <label><span className="form-label">{t.currentStatus}</span><input value={currentStatus} onChange={(e) => setCurrentStatus(e.target.value)} className="field" /></label>
            <label><span className="form-label">{t.majorBackground}</span><input value={majorBackground} onChange={(e) => setMajorBackground(e.target.value)} className="field" placeholder={isEn ? "e.g., CS major, bootcamp, business student" : "예: 컴공, 부트캠프, 경영학과"} /></label>
            <label><span className="form-label">{t.currentSkills}</span><textarea value={currentSkills} onChange={(e) => setCurrentSkills(e.target.value)} className="field min-h-20" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="form-label">{t.experienceLevel}</span>
                <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className="field">
                  {experienceOptions.map((option) => <option key={option.value} value={option.value}>{isEn ? option.en : option.ko}</option>)}
                </select>
              </label>
              <label>
                <span className="form-label">{t.targetRole}</span>
                <select value={targetRoleId} onChange={(e) => applyTemplate(e.target.value)} className="field">
                  {roleTemplates.map((template) => {
                    return <option key={template.roleEn} value={template.roleEn}>{isEn ? template.roleEn : template.roleKo}</option>;
                  })}
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="form-label">{t.targetCompanyType}</span>
                <select value={targetCompanyType} onChange={(e) => setTargetCompanyType(e.target.value)} className="field">
                  {companyTypeOptions.map((option) => <option key={option.value} value={option.value}>{isEn ? option.en : option.ko}</option>)}
                </select>
              </label>
              <label><span className="form-label">{t.timeline}</span><input value={timeline} onChange={(e) => setTimeline(e.target.value)} className="field" /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="form-label">{t.riskTolerance}</span>
                <select value={riskTolerance} onChange={(e) => setRiskTolerance(e.target.value as Level)} className="field">
                  <option value="low">{t.levels.low}</option>
                  <option value="medium">{t.levels.medium}</option>
                  <option value="high">{t.levels.high}</option>
                </select>
              </label>
              <label>
                <span className="form-label">{t.careerPriority}</span>
                <select value={careerPriority} onChange={(e) => setCareerPriority(e.target.value)} className="field">
                  {priorityOptions.map((option) => <option key={option.value} value={option.value}>{isEn ? option.en : option.ko}</option>)}
                </select>
              </label>
            </div>
            <button type="button" onClick={simulate} disabled={loading} className="primary-btn px-5 py-3 text-sm disabled:opacity-60">
              <BrainCircuit size={16} aria-hidden="true" />
              {loading ? t.simulating : t.simulate}
            </button>
            {error ? <Notice tone="warning">{error}</Notice> : null}
          </div>
        </PagePanel>

        <PagePanel>
          <SectionTitle title={t.template} description={t.templateDesc} />
          <div className="content-card ko-friendly mt-5 p-5">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness size={18} className="text-[var(--accent-2)]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-[var(--foreground)]">{isEn ? selectedTemplate.roleEn : selectedTemplate.roleKo}</h2>
            </div>
            {[
              [isEn ? "Entry points" : "입문 경로", isEn ? selectedTemplate.entryEn : selectedTemplate.entryKo],
              [isEn ? "Required skills" : "필요 기술", isEn ? selectedTemplate.skillsEn : selectedTemplate.skillsKo],
              [isEn ? "Portfolio projects" : "추천 포트폴리오", isEn ? selectedTemplate.projectsEn : selectedTemplate.projectsKo],
              [isEn ? "Interview focus" : "면접 포인트", isEn ? selectedTemplate.interviewEn : selectedTemplate.interviewKo],
            ].map(([title, items]) => (
              <div key={title as string} className="mt-5">
                <p className="text-sm font-semibold text-[var(--foreground)]">{title as string}</p>
                <div className="mt-3 flex flex-wrap gap-2">{(items as string[]).map((item) => <span key={item} className="chip">{item}</span>)}</div>
              </div>
            ))}
          </div>
        </PagePanel>
      </section>

      {!result ? <EmptyBoard title={isEn ? "Ready to play the next move" : "다음 수를 둘 준비가 됐습니다"} text={t.empty} /> : null}

      {result ? (
        <>
          <section className="mt-5">
            <PagePanel>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <SectionTitle title={t.summary} description={result.summary} />
                <div className="flex flex-wrap gap-2">
                  <span className="accent-pill px-3 py-1 text-xs font-semibold">{t.recommended}: {result.recommendedPath}</span>
                  <span className="accent-pill px-3 py-1 text-xs font-semibold">{result.evaluationId ? t.saved : result.source === "demo_fallback" ? t.demo : "AI"}</span>
                </div>
              </div>
              {result.sourceNote ? <Notice className="ko-friendly mt-5">{result.sourceNote}</Notice> : null}
            </PagePanel>
          </section>

          <section className="mt-5">
            <PagePanel>
              <SectionTitle title={t.paths} description={isEn ? "Safe, Growth, and Credential routes without fake precise probabilities." : "정확한 척하는 확률 대신 안정/성장/자격 강화 경로를 비교합니다."} />
              <div className="responsive-card-grid mt-5">
                {result.paths.map((path) => {
                  const Icon = pathIcon(path.id);
                  return (
                    <button key={path.id} type="button" onClick={() => setSelectedPathId(path.id)} className={`content-card clickable-card p-5 text-left ${selectedPathId === path.id ? "border-[color-mix(in_srgb,var(--accent-2)_58%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))]" : ""}`}>
                      <div className="flex items-start justify-between gap-4">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--accent-2)]"><Icon size={20} aria-hidden="true" /></span>
                        <div className="flex flex-wrap justify-end gap-2">
                          <span className={`rounded-full border bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold ${levelClass(path.fitLevel)}`}>{t.fit}: {t.levels[path.fitLevel]}</span>
                          <span className={`rounded-full border bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold ${levelClass(path.riskLevel)}`}>{t.risk}: {t.levels[path.riskLevel]}</span>
                        </div>
                      </div>
                      <h3 className="ko-friendly mt-5 text-xl font-semibold text-[var(--foreground)]">{path.title}</h3>
                      <p className="ko-friendly mt-3 text-sm leading-6 text-[var(--muted)]"><strong>{t.bestFor}: </strong>{path.bestFor}</p>
                      <p className="ko-friendly mt-2 text-sm leading-6 text-[var(--muted)]"><strong>{t.nextMove}: </strong>{path.nextMove}</p>
                    </button>
                  );
                })}
              </div>
            </PagePanel>
          </section>

          <section className="mt-5">
            <PagePanel>
              <SectionTitle title={t.timelineView} description={isEn ? "The strategy-game board: compare all routes side by side." : "커리어 체스의 핵심 보드입니다. 세 경로를 나란히 비교하세요."} />
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {result.paths.map((path) => (
                  <div key={path.id} className="content-card p-5">
                    <div className="flex items-center gap-2">
                      <GitBranch size={17} className="text-[var(--accent-2)]" aria-hidden="true" />
                      <h3 className="ko-friendly text-base font-semibold text-[var(--foreground)]">{path.title}</h3>
                    </div>
                    <div className="timeline-list mt-5">
                      {path.timeline.map((item, index) => (
                        <div key={item} className="timeline-row">
                          <span className="path-dot h-8 w-8 text-[0.7rem]">{index + 1}</span>
                          <p className="ko-friendly text-sm leading-6 text-[var(--muted-strong)]">{item}</p>
                          {index === 0 ? <BadgeCheck size={15} className="text-[var(--success)]" aria-hidden="true" /> : <span />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PagePanel>
          </section>

          {selectedPath ? (
            <section className="readable-grid-2 mt-5">
              <PagePanel>
                <SectionTitle title={selectedPath.title} description={selectedPath.nextMove} />
                <div className="responsive-card-grid mt-5">
                  <ListCard title={t.pros} items={selectedPath.pros} />
                  <ListCard title={t.cons} items={selectedPath.cons} />
                </div>
                <Notice className="ko-friendly mt-5"><strong>{t.bottleneck}: </strong>{selectedPath.mainBottleneck}</Notice>
              </PagePanel>
              <PagePanel>
                <SectionTitle title={t.gaps} />
                <div className="mt-5 flex flex-wrap gap-2">{result.skillGaps.map((gap) => <span key={gap} className="chip">{gap}</span>)}</div>
              </PagePanel>
            </section>
          ) : null}

          <section className="mt-5">
            <PagePanel>
              <SectionTitle title={t.decisions} description={isEn ? "Click a move to see how it changes risk, timing, gaps, and next action." : "의사결정을 클릭하면 리스크, 타임라인, 스킬 갭, 다음 액션이 바뀝니다."} />
              <div className="responsive-card-grid mt-5">
                {result.decisionCards.map((decision) => (
                  <button key={decision.id} type="button" onClick={() => setSelectedDecisionId(decision.id)} className={`content-card clickable-card ko-friendly p-5 text-left ${selectedDecision?.id === decision.id ? "border-[color-mix(in_srgb,var(--accent-2)_58%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))]" : ""}`}>
                    <Swords size={18} className="text-[var(--accent-2)]" aria-hidden="true" />
                    <p className="mt-4 text-sm font-semibold leading-6 text-[var(--foreground)]">{decision.title}</p>
                  </button>
                ))}
              </div>
              {selectedDecision ? (
                <div className="responsive-card-grid mt-5">
                  <MetricTile label={t.risk} value={selectedDecision.riskImpact} />
                  <MetricTile label={t.timeline} value={selectedDecision.timelineImpact} />
                  <MetricTile label={t.gaps} value={selectedDecision.skillGapImpact} />
                  <MetricTile label={t.nextMove} value={selectedDecision.nextAction} />
                </div>
              ) : null}
            </PagePanel>
          </section>

          <section className="readable-grid-2 mt-5">
            <PagePanel>
              <SectionTitle title={t.risks} />
              <div className="mt-5 grid gap-3">
                {result.riskEvents.map((risk) => (
                  <div key={risk.title} className="content-card ko-friendly p-5">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={17} className="text-[var(--warning)]" aria-hidden="true" />
                      <p className="font-semibold text-[var(--foreground)]">{risk.title}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{risk.description}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]"><strong>{t.impact}: </strong>{risk.impact}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]"><strong>{t.prevention}: </strong>{risk.prevention}</p>
                  </div>
                ))}
              </div>
            </PagePanel>
            <PagePanel>
              <SectionTitle title={t.plan} description={isEn ? "Leave with a next move, not just a simulation." : "흥미로운 시뮬레이션에서 끝나지 않고 바로 실행할 다음 수입니다."} />
              <div className="timeline-list mt-5">
                {result.ninetyDayPlan.map((action, index) => (
                  <div key={action} className="timeline-row">
                    <span className="path-dot h-8 w-8 text-[0.7rem]">{index + 1}</span>
                    <p className="ko-friendly text-sm leading-6 text-[var(--muted-strong)]">{action}</p>
                    {index === 0 ? <Flag size={15} className="text-[var(--success)]" aria-hidden="true" /> : <span />}
                  </div>
                ))}
              </div>
            </PagePanel>
          </section>
        </>
      ) : null}
    </PageShell>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="content-card p-5">
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      <ul className="ko-friendly mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted)]">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function EmptyBoard({ title, text }: { title: string; text: string }) {
  return (
    <section className="mt-5">
      <PagePanel>
        <div className="ko-friendly rounded-2xl border border-[color-mix(in_srgb,var(--accent-2)_38%,var(--line))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_16%,transparent),color-mix(in_srgb,var(--accent-2)_10%,transparent))] p-6">
          <div className="flex items-start gap-3">
            <Route size={22} className="mt-1 text-[var(--accent-2)]" aria-hidden="true" />
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">{title}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">{text}</p>
            </div>
          </div>
        </div>
      </PagePanel>
    </section>
  );
}
