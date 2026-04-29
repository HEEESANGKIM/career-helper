"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ClipboardCheck,
  Code2,
  Filter,
  Palette,
  Play,
  Search,
  Users,
} from "lucide-react";
import { MetricTile, Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { useLanguage } from "@/components/language-provider";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Category = "tech" | "business" | "creative" | "corporate";
type Difficulty = "easy" | "medium" | "hard" | "elite";
type FilterKey = "all" | "beginner" | "tech" | "business" | "creative" | "corporate" | "hard";

type Persona = {
  id: string;
  name: string;
  roleKo: string;
  roleEn: string;
  category: Category;
  difficulty: Difficulty;
  styleKo: string;
  styleEn: string;
  attitudeKo: string;
  attitudeEn: string;
  summaryKo: string;
  summaryEn: string;
  competitivenessKo: string;
  competitivenessEn: string;
  focusKo: string[];
  focusEn: string[];
  questionsKo: string[];
  questionsEn: string[];
};

type HiringResult = {
  overallScore: number;
  passProbability: number;
  categoryScores: {
    communication: number;
    problemSolving: number;
    roleFit: number;
    companyFit: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  nextPracticeQuestion: string;
  roleData?: {
    sourceNote: string;
    requiredSkills: string[];
    interviewFocus: string[];
    commonRisks: string[];
    recommendedProjects: string[];
    beginnerEntryPoints: string[];
  };
  source?: "openai" | "demo_fallback";
  evaluationId?: string | null;
};

const personas: Persona[] = [
  {
    id: "junior-frontend",
    name: "Junior Frontend Panel",
    roleKo: "주니어 프론트엔드 개발자",
    roleEn: "Junior Frontend Developer",
    category: "tech",
    difficulty: "medium",
    styleKo: "구현력과 사용자 경험을 함께 보는 실무형 평가",
    styleEn: "Practical lens for implementation quality and user experience",
    attitudeKo: "기본 웹 지식, 컴포넌트 사고, 디버깅 방식, 협업 커뮤니케이션을 봅니다.",
    attitudeEn: "Looks for web fundamentals, component thinking, debugging habits, and collaboration clarity.",
    summaryKo: "학생과 신입에게 현실적인 프론트엔드 실무 면접입니다.",
    summaryEn: "A realistic frontend interview for students and new grads.",
    competitivenessKo: "경쟁도 중간",
    competitivenessEn: "Medium competition",
    focusKo: ["HTML/CSS/JS", "React", "디버깅", "사용자 경험"],
    focusEn: ["HTML/CSS/JS", "React", "Debugging", "UX"],
    questionsKo: ["최근 만든 UI에서 사용성이나 성능을 개선했던 경험을 설명해 주세요."],
    questionsEn: ["Describe a UI you built recently and how you improved usability or performance."],
  },
  {
    id: "backend-developer",
    name: "Backend Engineering Panel",
    roleKo: "백엔드 개발자",
    roleEn: "Backend Developer",
    category: "tech",
    difficulty: "hard",
    styleKo: "API 설계, 데이터 모델링, 장애 대응을 보는 기술 평가",
    styleEn: "Technical lens for API design, data modeling, and incident handling",
    attitudeKo: "기술 선택의 이유, 데이터 흐름, 오류 처리, 확장성의 기본 감각을 확인합니다.",
    attitudeEn: "Looks for rationale, data flow, error handling, and basic scalability judgment.",
    summaryKo: "신입에게는 어렵지만 준비하면 충분히 대응 가능한 백엔드 면접입니다.",
    summaryEn: "A challenging but realistic backend interview for entry-level candidates.",
    competitivenessKo: "경쟁도 높음",
    competitivenessEn: "High competition",
    focusKo: ["API", "DB", "오류 처리", "확장성"],
    focusEn: ["API", "Database", "Errors", "Scalability"],
    questionsKo: ["간단한 게시글 작성 API를 설계한다면 요청, 저장, 오류 처리를 어떻게 구성하겠습니까?"],
    questionsEn: ["How would you design request handling, storage, and errors for a simple post creation API?"],
  },
  {
    id: "qa-engineer",
    name: "QA Engineering Lead",
    roleKo: "QA 엔지니어",
    roleEn: "QA Engineer",
    category: "tech",
    difficulty: "medium",
    styleKo: "꼼꼼함과 재현 가능성을 보는 품질 평가",
    styleEn: "Quality lens for precision, reproducibility, and test thinking",
    attitudeKo: "버그를 구조화해서 설명하고, 우선순위와 재현 절차를 명확히 말하는지 봅니다.",
    attitudeEn: "Looks for clear bug reports, prioritization, reproduction steps, and test coverage thinking.",
    summaryKo: "테스트 경험이 많지 않은 신입도 접근 가능한 품질 직무 면접입니다.",
    summaryEn: "An approachable quality role interview for early-career candidates.",
    competitivenessKo: "경쟁도 중간",
    competitivenessEn: "Medium competition",
    focusKo: ["테스트 케이스", "재현 절차", "우선순위", "문서화"],
    focusEn: ["Test cases", "Reproduction", "Priority", "Documentation"],
    questionsKo: ["로그인 기능을 테스트한다면 어떤 정상/예외 케이스를 먼저 확인하겠습니까?"],
    questionsEn: ["If you tested a login feature, which success and edge cases would you check first?"],
  },
  {
    id: "it-support",
    name: "IT Support Manager",
    roleKo: "IT 지원 담당자",
    roleEn: "IT Support Specialist",
    category: "tech",
    difficulty: "easy",
    styleKo: "문제 해결 태도와 고객 응대를 보는 지원형 평가",
    styleEn: "Support lens for troubleshooting attitude and user communication",
    attitudeKo: "차분한 질문, 원인 분리, 비전문가에게 쉽게 설명하는 능력을 봅니다.",
    attitudeEn: "Looks for calm questioning, issue isolation, and plain-language explanations.",
    summaryKo: "첫 직장 지원자에게 적합한 입문형 IT 직무 면접입니다.",
    summaryEn: "A beginner-friendly IT role for first-job candidates.",
    competitivenessKo: "입문 친화",
    competitivenessEn: "Beginner friendly",
    focusKo: ["문제 분리", "고객 응대", "문서화", "침착함"],
    focusEn: ["Troubleshooting", "Support", "Documentation", "Calmness"],
    questionsKo: ["사용자가 인터넷이 안 된다고 할 때 어떤 순서로 원인을 확인하겠습니까?"],
    questionsEn: ["A user says the internet is not working. What steps would you take first?"],
  },
  {
    id: "data-analyst",
    name: "Data Analytics Manager",
    roleKo: "데이터 분석가",
    roleEn: "Data Analyst",
    category: "tech",
    difficulty: "hard",
    styleKo: "비즈니스 질문을 데이터로 바꾸는 분석 평가",
    styleEn: "Analytics lens for turning business questions into data work",
    attitudeKo: "가설 설정, 지표 정의, SQL/시각화, 한계 설명을 봅니다.",
    attitudeEn: "Looks for hypotheses, metrics, SQL/visualization thinking, and caveats.",
    summaryKo: "정량 사고와 커뮤니케이션이 함께 필요한 신입 분석 직무입니다.",
    summaryEn: "An entry-level analytics role requiring both quantitative thinking and communication.",
    competitivenessKo: "경쟁도 높음",
    competitivenessEn: "High competition",
    focusKo: ["지표", "SQL", "인사이트", "한계"],
    focusEn: ["Metrics", "SQL", "Insights", "Caveats"],
    questionsKo: ["구매 전환율이 떨어졌다면 어떤 지표와 데이터를 먼저 확인하겠습니까?"],
    questionsEn: ["If purchase conversion dropped, which metrics and data would you check first?"],
  },
  {
    id: "cybersecurity",
    name: "Security Analyst Lead",
    roleKo: "사이버보안 분석가",
    roleEn: "Cybersecurity Analyst",
    category: "tech",
    difficulty: "hard",
    styleKo: "리스크 감각과 조사 절차를 보는 보안 평가",
    styleEn: "Security lens for risk judgment and investigation process",
    attitudeKo: "로그 확인, 위협 우선순위, 보고 체계, 윤리적 태도를 확인합니다.",
    attitudeEn: "Looks for log review, threat prioritization, reporting flow, and ethical judgment.",
    summaryKo: "기초 보안 지식과 침착한 대응이 중요한 초급 보안 면접입니다.",
    summaryEn: "A junior security interview centered on fundamentals and calm response.",
    competitivenessKo: "경쟁도 높음",
    competitivenessEn: "High competition",
    focusKo: ["로그", "리스크", "보고", "윤리"],
    focusEn: ["Logs", "Risk", "Reporting", "Ethics"],
    questionsKo: ["의심스러운 로그인 알림을 받았다면 어떤 순서로 조사하겠습니까?"],
    questionsEn: ["How would you investigate a suspicious login alert?"],
  },
  {
    id: "entry-pm",
    name: "Entry Product Panel",
    roleKo: "엔트리 레벨 프로덕트 매니저",
    roleEn: "Product Manager (Entry Level)",
    category: "business",
    difficulty: "hard",
    styleKo: "사용자 문제, 우선순위, 지표를 보는 제품 평가",
    styleEn: "Product lens for user problems, prioritization, and metrics",
    attitudeKo: "문제를 정의하고 사용자/비즈니스/실행 가능성을 균형 있게 설명하는지 봅니다.",
    attitudeEn: "Looks for balanced reasoning across users, business value, and execution.",
    summaryKo: "경험이 적어도 사고 과정으로 승부하는 제품 직무 면접입니다.",
    summaryEn: "A product interview where early candidates can win through structured thinking.",
    competitivenessKo: "경쟁도 높음",
    competitivenessEn: "High competition",
    focusKo: ["문제 정의", "우선순위", "지표", "사용자"],
    focusEn: ["Problem", "Priority", "Metrics", "Users"],
    questionsKo: ["학생용 생산성 앱의 리텐션을 높이기 위해 어떤 기능을 먼저 만들겠습니까?"],
    questionsEn: ["What feature would you prioritize to improve retention for a student productivity app?"],
  },
  {
    id: "business-analyst",
    name: "Business Analysis Manager",
    roleKo: "비즈니스 분석가",
    roleEn: "Business Analyst",
    category: "business",
    difficulty: "medium",
    styleKo: "문제 구조화와 이해관계자 소통을 보는 분석 평가",
    styleEn: "Business lens for problem structuring and stakeholder communication",
    attitudeKo: "모호한 요청을 요구사항과 액션으로 정리하는 능력을 봅니다.",
    attitudeEn: "Looks for turning ambiguous requests into requirements, analysis, and actions.",
    summaryKo: "문과/이과 신입 모두 준비 가능한 범용 비즈니스 직무입니다.",
    summaryEn: "A broad business role suitable for many new graduates.",
    competitivenessKo: "경쟁도 중간",
    competitivenessEn: "Medium competition",
    focusKo: ["요구사항", "분석", "소통", "실행"],
    focusEn: ["Requirements", "Analysis", "Communication", "Execution"],
    questionsKo: ["매출이 줄었다는 요청을 받으면 어떤 질문으로 문제를 구조화하겠습니까?"],
    questionsEn: ["If a team says revenue dropped, what questions would you ask to structure the problem?"],
  },
  {
    id: "operations-associate",
    name: "Operations Manager",
    roleKo: "운영 어소시에이트",
    roleEn: "Operations Associate",
    category: "business",
    difficulty: "easy",
    styleKo: "꼼꼼함, 속도, 프로세스 개선을 보는 운영 평가",
    styleEn: "Operations lens for reliability, pace, and process improvement",
    attitudeKo: "반복 업무를 정확히 처리하고 작은 개선점을 찾는 태도를 봅니다.",
    attitudeEn: "Looks for accuracy in repeated work and practical improvement ideas.",
    summaryKo: "첫 사무직으로 현실적인 입문형 운영 면접입니다.",
    summaryEn: "A realistic beginner-friendly operations interview.",
    competitivenessKo: "입문 친화",
    competitivenessEn: "Beginner friendly",
    focusKo: ["정확성", "우선순위", "프로세스", "협업"],
    focusEn: ["Accuracy", "Priority", "Process", "Teamwork"],
    questionsKo: ["반복적으로 실수가 나는 업무 프로세스를 발견하면 어떻게 개선하겠습니까?"],
    questionsEn: ["How would you improve a workflow where repeated mistakes keep happening?"],
  },
  {
    id: "sdr",
    name: "Sales Development Lead",
    roleKo: "세일즈 개발 담당자",
    roleEn: "Sales Development Representative",
    category: "business",
    difficulty: "medium",
    styleKo: "자신감, 설득, 거절 대응을 보는 영업 평가",
    styleEn: "Sales lens for confidence, persuasion, and objection handling",
    attitudeKo: "상대의 니즈를 듣고 거절을 압박이 아닌 대화로 푸는지 봅니다.",
    attitudeEn: "Looks for listening, persuasion, resilience, and respectful objection handling.",
    summaryKo: "커뮤니케이션 역량을 보여주기 좋은 초급 세일즈 면접입니다.",
    summaryEn: "An entry-level sales interview where communication matters most.",
    competitivenessKo: "경쟁도 중간",
    competitivenessEn: "Medium competition",
    focusKo: ["설득", "자신감", "거절 대응", "리서치"],
    focusEn: ["Persuasion", "Confidence", "Objections", "Research"],
    questionsKo: ["관심 없다고 말하는 잠재 고객에게 어떻게 대화를 이어가겠습니까?"],
    questionsEn: ["How would you continue a conversation with a prospect who says they are not interested?"],
  },
  {
    id: "uiux-designer",
    name: "Design Review Panel",
    roleKo: "UI/UX 디자이너",
    roleEn: "UI/UX Designer",
    category: "creative",
    difficulty: "medium",
    styleKo: "사용자 공감과 디자인 프로세스를 보는 포트폴리오 평가",
    styleEn: "Design lens for user empathy, process, and portfolio thinking",
    attitudeKo: "예쁜 화면보다 문제 정의, 사용자 근거, 반복 개선을 설명하는지 봅니다.",
    attitudeEn: "Looks beyond visuals into problem framing, user evidence, and iteration.",
    summaryKo: "포트폴리오를 말로 설명하는 연습에 적합한 디자인 면접입니다.",
    summaryEn: "A design interview focused on explaining portfolio decisions clearly.",
    competitivenessKo: "경쟁도 중간",
    competitivenessEn: "Medium competition",
    focusKo: ["사용자 공감", "프로세스", "포트폴리오", "반복"],
    focusEn: ["Empathy", "Process", "Portfolio", "Iteration"],
    questionsKo: ["포트폴리오 프로젝트 하나를 골라 어떤 사용자 문제를 해결했는지 설명해 주세요."],
    questionsEn: ["Pick one portfolio project and explain the user problem you solved."],
  },
  {
    id: "digital-marketing",
    name: "Growth Marketing Manager",
    roleKo: "디지털 마케팅 어소시에이트",
    roleEn: "Digital Marketing Associate",
    category: "creative",
    difficulty: "medium",
    styleKo: "캠페인 사고와 숫자 감각을 보는 마케팅 평가",
    styleEn: "Marketing lens for campaign thinking and metric awareness",
    attitudeKo: "타깃, 채널, 메시지, 성과 지표를 연결해서 설명하는지 봅니다.",
    attitudeEn: "Looks for target audience, channels, messaging, and performance metrics.",
    summaryKo: "콘텐츠와 데이터 감각을 함께 보여주는 초급 마케팅 면접입니다.",
    summaryEn: "An entry-level marketing interview balancing content and data sense.",
    competitivenessKo: "경쟁도 중간",
    competitivenessEn: "Medium competition",
    focusKo: ["타깃", "채널", "콘텐츠", "성과"],
    focusEn: ["Audience", "Channels", "Content", "Metrics"],
    questionsKo: ["신규 앱을 대학생에게 알린다면 어떤 채널과 메시지를 선택하겠습니까?"],
    questionsEn: ["Which channels and message would you use to promote a new app to college students?"],
  },
  {
    id: "content-strategist",
    name: "Content Strategy Lead",
    roleKo: "콘텐츠 전략가",
    roleEn: "Content Strategist",
    category: "creative",
    difficulty: "medium",
    styleKo: "메시지 구조와 독자 이해를 보는 콘텐츠 평가",
    styleEn: "Content lens for message structure and audience insight",
    attitudeKo: "누구에게, 왜, 어떤 톤으로 말할지 명확히 설명하는지 봅니다.",
    attitudeEn: "Looks for audience clarity, narrative structure, tone, and editorial judgment.",
    summaryKo: "글쓰기 경험을 전략적으로 설명하는 초급 콘텐츠 면접입니다.",
    summaryEn: "A content interview for explaining writing experience strategically.",
    competitivenessKo: "경쟁도 중간",
    competitivenessEn: "Medium competition",
    focusKo: ["독자", "메시지", "톤", "편집"],
    focusEn: ["Audience", "Message", "Tone", "Editing"],
    questionsKo: ["같은 제품을 학생과 직장인에게 각각 어떻게 다르게 설명하겠습니까?"],
    questionsEn: ["How would you describe the same product differently to students and working professionals?"],
  },
  {
    id: "hr-coordinator",
    name: "HR Coordination Panel",
    roleKo: "HR 코디네이터",
    roleEn: "HR Coordinator",
    category: "corporate",
    difficulty: "easy",
    styleKo: "전문성, 정리력, 커뮤니케이션을 보는 인사 평가",
    styleEn: "HR lens for professionalism, organization, and communication",
    attitudeKo: "민감한 정보를 다루는 태도, 일정 조율, 문서 정리 능력을 봅니다.",
    attitudeEn: "Looks for discretion, scheduling, documentation, and professional communication.",
    summaryKo: "신입 사무직 지원자가 연습하기 좋은 입문형 HR 면접입니다.",
    summaryEn: "A beginner-friendly HR interview for early corporate candidates.",
    competitivenessKo: "입문 친화",
    competitivenessEn: "Beginner friendly",
    focusKo: ["커뮤니케이션", "정리력", "전문성", "배려"],
    focusEn: ["Communication", "Organization", "Professionalism", "Care"],
    questionsKo: ["여러 면접 일정을 동시에 조율해야 한다면 어떻게 관리하겠습니까?"],
    questionsEn: ["How would you manage several interview schedules at the same time?"],
  },
  {
    id: "new-grad-recruiter",
    name: "New Graduate Recruiter",
    roleKo: "일반 신입 채용 담당자",
    roleEn: "General New Graduate Recruiter",
    category: "corporate",
    difficulty: "easy",
    styleKo: "잠재력, 태도, 기본 직무 이해도를 보는 신입 평가",
    styleEn: "New-grad lens for potential, attitude, and basic role understanding",
    attitudeKo: "완벽한 경험보다 배우는 태도, 성실함, 역할 이해도를 봅니다.",
    attitudeEn: "Looks for learning attitude, reliability, and basic understanding more than perfect experience.",
    summaryKo: "대부분의 신입 공채/인턴 면접에 가까운 범용 연습 모드입니다.",
    summaryEn: "A general interview mode close to many new-grad and internship screens.",
    competitivenessKo: "입문 친화",
    competitivenessEn: "Beginner friendly",
    focusKo: ["태도", "성장 가능성", "기본기", "진정성"],
    focusEn: ["Attitude", "Potential", "Basics", "Authenticity"],
    questionsKo: ["이 직무에 지원한 이유와 입사 후 가장 먼저 배우고 싶은 것을 말해 주세요."],
    questionsEn: ["Why did you apply for this role, and what would you want to learn first?"],
  },
  {
    id: "customer-success",
    name: "Customer Success Manager",
    roleKo: "고객 성공 어소시에이트",
    roleEn: "Customer Success Associate",
    category: "business",
    difficulty: "easy",
    styleKo: "고객 공감과 문제 해결을 보는 CS 평가",
    styleEn: "Customer lens for empathy, problem solving, and follow-through",
    attitudeKo: "고객의 상황을 이해하고 다음 조치를 명확히 안내하는지 봅니다.",
    attitudeEn: "Looks for empathy, clear next steps, and reliable follow-through.",
    summaryKo: "서비스 직무 경험을 살리기 좋은 입문형 고객 직무 면접입니다.",
    summaryEn: "A beginner-friendly customer role for candidates with service experience.",
    competitivenessKo: "입문 친화",
    competitivenessEn: "Beginner friendly",
    focusKo: ["공감", "문제 해결", "후속 조치", "친절함"],
    focusEn: ["Empathy", "Problem solving", "Follow-up", "Care"],
    questionsKo: ["불만이 있는 고객에게 어떻게 상황을 확인하고 해결 방향을 안내하겠습니까?"],
    questionsEn: ["How would you respond to an upset customer and guide them toward a solution?"],
  },
  {
    id: "finance-analyst",
    name: "Finance Analysis Manager",
    roleKo: "재무 분석가",
    roleEn: "Finance Analyst",
    category: "corporate",
    difficulty: "hard",
    styleKo: "정확성, 숫자 해석, 리스크 감각을 보는 재무 평가",
    styleEn: "Finance lens for accuracy, numeric interpretation, and risk judgment",
    attitudeKo: "숫자의 의미를 설명하고 가정과 리스크를 분리해서 말하는지 봅니다.",
    attitudeEn: "Looks for explaining numbers, assumptions, risk, and business implications.",
    summaryKo: "정량적 사고를 보여줘야 하는 신입 재무 직무 면접입니다.",
    summaryEn: "An entry-level finance interview requiring careful quantitative thinking.",
    competitivenessKo: "경쟁도 높음",
    competitivenessEn: "High competition",
    focusKo: ["정확성", "가정", "리스크", "숫자 해석"],
    focusEn: ["Accuracy", "Assumptions", "Risk", "Numbers"],
    questionsKo: ["예산 대비 비용이 초과되었다면 어떤 데이터를 먼저 확인하겠습니까?"],
    questionsEn: ["If spending exceeds budget, what data would you check first?"],
  },
  {
    id: "supply-chain",
    name: "Supply Chain Lead",
    roleKo: "공급망 코디네이터",
    roleEn: "Supply Chain Coordinator",
    category: "business",
    difficulty: "medium",
    styleKo: "일정, 재고, 협업 리스크를 보는 운영형 평가",
    styleEn: "Supply chain lens for schedules, inventory, and coordination risk",
    attitudeKo: "지연 상황에서 우선순위를 세우고 관련자에게 명확히 공유하는지 봅니다.",
    attitudeEn: "Looks for prioritization, coordination, and clear communication during delays.",
    summaryKo: "운영과 물류에 관심 있는 신입에게 현실적인 면접입니다.",
    summaryEn: "A realistic interview for entry-level operations and logistics candidates.",
    competitivenessKo: "경쟁도 중간",
    competitivenessEn: "Medium competition",
    focusKo: ["일정", "재고", "협업", "리스크"],
    focusEn: ["Schedule", "Inventory", "Coordination", "Risk"],
    questionsKo: ["중요한 납품이 지연될 때 어떤 순서로 대응하겠습니까?"],
    questionsEn: ["How would you respond when an important delivery is delayed?"],
  },
  {
    id: "google-swe-style",
    name: "Google SWE Style",
    roleKo: "엘리트 소프트웨어 엔지니어",
    roleEn: "Elite Software Engineer",
    category: "tech",
    difficulty: "elite",
    styleKo: "대규모 시스템과 엄격한 기술 근거를 보는 엘리트 평가",
    styleEn: "Elite technical lens for large-scale systems and rigorous rationale",
    attitudeKo: "모호한 문제를 구조화하고, 확장성/제약/트레이드오프를 깊게 설명하는지 봅니다.",
    attitudeEn: "Looks for decomposition, scalability, constraints, and deep tradeoff reasoning.",
    summaryKo: "상위권 빅테크 스타일을 연습하는 고난도 모드입니다.",
    summaryEn: "A high-difficulty mode for top-tier big-tech style practice.",
    competitivenessKo: "엘리트",
    competitivenessEn: "Elite",
    focusKo: ["시스템 설계", "알고리즘 사고", "확장성", "근거"],
    focusEn: ["System design", "Algorithms", "Scalability", "Rationale"],
    questionsKo: ["글로벌 트래픽 급증을 처리하는 URL 단축기를 설계해 주세요."],
    questionsEn: ["Design a URL shortener that can handle global traffic spikes."],
  },
  {
    id: "meta-pm-style",
    name: "Meta PM Style",
    roleKo: "상위권 프로덕트 매니저",
    roleEn: "Top-tier Product Manager",
    category: "business",
    difficulty: "elite",
    styleKo: "제품 감각, 실험, 지표 우선순위를 보는 엘리트 평가",
    styleEn: "Elite product lens for product sense, experiments, and metric priority",
    attitudeKo: "사용자 문제를 지표와 실험으로 연결하고 전략적 선택을 설명하는지 봅니다.",
    attitudeEn: "Looks for connecting user problems to metrics, experiments, and strategic choices.",
    summaryKo: "상위권 PM/프로덕트 직무를 준비하는 고난도 모드입니다.",
    summaryEn: "A high-difficulty mode for top-tier product role practice.",
    competitivenessKo: "엘리트",
    competitivenessEn: "Elite",
    focusKo: ["제품 감각", "실험", "지표", "전략"],
    focusEn: ["Product sense", "Experiments", "Metrics", "Strategy"],
    questionsKo: ["크리에이터 리텐션을 판단할 핵심 지표 하나를 고르고 이유를 설명해 주세요."],
    questionsEn: ["Choose one metric for creator retention and explain why it matters."],
  },
];

const copy = {
  ko: {
    eyebrow: "채용 시뮬레이터",
    title: "Hiring Manager Simulator",
    description: "학생, 신입, 주니어 지원자를 위한 직무별 평가 관점으로 답변을 점검하세요.",
    back: "면접 연습으로",
    notice: "모든 페르소나는 회사/직무 스타일을 바탕으로 한 시뮬레이션이며 실제 채용 담당자를 사칭하지 않습니다.",
    selector: "평가 관점 선택",
    selected: "선택한 관점",
    lens: "이 관점이 보는 태도",
    question: "질문",
    questionDesc: "질문을 수정해도 선택한 직무 기준으로 평가됩니다.",
    answer: "내 답변",
    answerPlaceholder: "상황, 역할, 행동, 결과, 배운 점이나 정량 근거를 포함해 작성하세요.",
    evaluate: "평가하기",
    evaluating: "평가 중...",
    result: "평가 결과",
    strengths: "강점",
    weaknesses: "약점",
    recommendations: "개선 제안",
    nextQuestion: "다음 질문",
    saved: "저장됨",
    demo: "데모",
    errors: "평가를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    passSignal: "통과 신호",
    overall: "종합 점수",
    estimated: "연습용 추정 신호",
    roleDataNote: "직무 데이터 기반 평가",
    criteria: "핵심 평가 기준",
    difficulty: "난이도",
    category: "분야",
    competitiveness: "경쟁도",
    search: "직무, 분야, 키워드 검색",
    loadMore: "더 보기",
    showing: "표시 중",
    noPersonas: "조건에 맞는 페르소나가 없습니다.",
    start: "선택",
    filters: {
      all: "전체",
      beginner: "입문 친화",
      tech: "테크",
      business: "비즈니스",
      creative: "크리에이티브",
      corporate: "코퍼레이트",
      hard: "하드 모드",
    },
    categories: {
      tech: "테크",
      business: "비즈니스",
      creative: "크리에이티브",
      corporate: "코퍼레이트",
    },
    difficulties: {
      easy: "Easy",
      medium: "Medium",
      hard: "Hard",
      elite: "Elite",
    },
  },
  en: {
    eyebrow: "Hiring Simulator",
    title: "Hiring Manager Simulator",
    description: "Review your answer through role-specific lenses built for students, new grads, and early-career candidates.",
    back: "Back to Interview",
    notice: "All personas are simulated from role/company-style patterns and do not represent real hiring managers.",
    selector: "Choose evaluation lens",
    selected: "Selected lens",
    lens: "What this lens values",
    question: "Question",
    questionDesc: "You can edit the prompt; the selected role criteria still applies.",
    answer: "Your answer",
    answerPlaceholder: "Use situation, role, action, result, learning, and measurable evidence.",
    evaluate: "Evaluate",
    evaluating: "Evaluating...",
    result: "Evaluation Result",
    strengths: "Strengths",
    weaknesses: "Weaknesses",
    recommendations: "Recommendations",
    nextQuestion: "Next question",
    saved: "Saved",
    demo: "Demo",
    errors: "Could not complete evaluation. Please try again.",
    passSignal: "Pass signal",
    overall: "Overall score",
    estimated: "Estimated practice signal",
    roleDataNote: "Evaluation based on role data",
    criteria: "Key criteria",
    difficulty: "Difficulty",
    category: "Category",
    competitiveness: "Competitiveness",
    search: "Search roles, categories, keywords",
    loadMore: "Load More",
    showing: "Showing",
    noPersonas: "No personas match this filter.",
    start: "Select",
    filters: {
      all: "All",
      beginner: "Beginner Friendly",
      tech: "Tech",
      business: "Business",
      creative: "Creative",
      corporate: "Corporate",
      hard: "Hard Mode",
    },
    categories: {
      tech: "Tech",
      business: "Business",
      creative: "Creative",
      corporate: "Corporate",
    },
    difficulties: {
      easy: "Easy",
      medium: "Medium",
      hard: "Hard",
      elite: "Elite",
    },
  },
};

const filters: FilterKey[] = ["all", "beginner", "tech", "business", "creative", "corporate", "hard"];

function categoryIcon(category: Category) {
  if (category === "tech") return Code2;
  if (category === "business") return BriefcaseBusiness;
  if (category === "creative") return Palette;
  return Users;
}

function difficultyTone(difficulty: Difficulty) {
  if (difficulty === "easy") return "border-[color-mix(in_srgb,var(--success)_38%,var(--line))] text-[var(--success)]";
  if (difficulty === "medium") return "border-[color-mix(in_srgb,var(--accent-2)_42%,var(--line))] text-[var(--accent-2)]";
  if (difficulty === "hard") return "border-[color-mix(in_srgb,var(--warning)_42%,var(--line))] text-[var(--warning)]";
  return "border-[color-mix(in_srgb,var(--danger)_42%,var(--line))] text-[var(--danger)]";
}

function roleFocus(persona: Persona, language: "ko" | "en") {
  const focus = language === "en" ? persona.focusEn : persona.focusKo;
  return [
    language === "en" ? `Role: ${persona.roleEn}` : `직무: ${persona.roleKo}`,
    language === "en" ? `Hiring style: ${persona.styleEn}` : `평가 스타일: ${persona.styleKo}`,
    language === "en" ? `Focus areas: ${focus.join(", ")}` : `중점 평가: ${focus.join(", ")}`,
    language === "en" ? `Attitude: ${persona.attitudeEn}` : `평가 태도: ${persona.attitudeKo}`,
  ].join("\n");
}

function scoreRows(result: HiringResult, language: "ko" | "en") {
  const names =
    language === "en"
      ? { communication: "Communication", problemSolving: "Problem solving", roleFit: "Role fit", companyFit: "Company fit" }
      : { communication: "커뮤니케이션", problemSolving: "문제 해결", roleFit: "직무 적합도", companyFit: "조직 적합도" };

  return Object.entries(result.categoryScores).map(([key, value]) => ({
    label: names[key as keyof typeof names],
    value,
  }));
}

export default function HiringManagerSimulatorPage() {
  const { language } = useLanguage();
  const t = copy[language];
  const isEn = language === "en";
  const [selectedId, setSelectedId] = useState(personas[0].id);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);
  const selectedPersona = useMemo(() => personas.find((persona) => persona.id === selectedId) ?? personas[0], [selectedId]);
  const [question, setQuestion] = useState((isEn ? selectedPersona.questionsEn : selectedPersona.questionsKo)[0]);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<HiringResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredPersonas = useMemo(() => {
    const query = search.trim().toLowerCase();
    return personas.filter((persona) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "beginner" && persona.difficulty === "easy") ||
        (filter === "hard" && (persona.difficulty === "hard" || persona.difficulty === "elite")) ||
        persona.category === filter;

      const haystack = [
        persona.name,
        persona.roleKo,
        persona.roleEn,
        persona.styleKo,
        persona.styleEn,
        persona.summaryKo,
        persona.summaryEn,
        ...persona.focusKo,
        ...persona.focusEn,
      ]
        .join(" ")
        .toLowerCase();

      return matchesFilter && (!query || haystack.includes(query));
    });
  }, [filter, search]);

  const visiblePersonas = filteredPersonas.slice(0, visibleCount);
  const focusAreas = isEn ? selectedPersona.focusEn : selectedPersona.focusKo;
  const CategoryIcon = categoryIcon(selectedPersona.category);

  const selectPersona = (persona: Persona) => {
    setSelectedId(persona.id);
    setQuestion((isEn ? persona.questionsEn : persona.questionsKo)[0]);
    setResult(null);
    setError("");
  };

  const changeFilter = (nextFilter: FilterKey) => {
    setFilter(nextFilter);
    setVisibleCount(6);
  };

  const evaluate = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    setError("");

    try {
      const session = supabase && isSupabaseConfigured ? (await supabase.auth.getSession()).data.session : null;
      const response = await fetch("/api/evaluate/hiring-manager", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          selectedPersona: selectedPersona.name,
          companyStyle: isEn ? selectedPersona.styleEn : selectedPersona.styleKo,
          role: isEn ? selectedPersona.roleEn : selectedPersona.roleKo,
          evaluationFocus: roleFocus(selectedPersona, language),
          question,
          userAnswer: answer,
          language,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || t.errors);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell maxWidth="max-w-7xl">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={<Link href="/simulator" className="secondary-btn px-5 py-3 text-sm">{t.back}</Link>}
      />

      <Notice className="ko-friendly mb-5">{t.notice}</Notice>

      <section className="readable-grid-2">
        <PagePanel>
          <SectionTitle title={t.selector} description={`${t.showing} ${visiblePersonas.length}/${filteredPersonas.length}`} />
          <label className="relative mt-5 block">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} aria-hidden="true" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(6); }} className="field pl-11" placeholder={t.search} />
          </label>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => changeFilter(item)}
                className={`secondary-btn shrink-0 px-3 py-2 text-xs ${filter === item ? "border-[color-mix(in_srgb,var(--accent-2)_56%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" : ""}`}
              >
                <Filter size={13} aria-hidden="true" />
                {t.filters[item]}
              </button>
            ))}
          </div>

          <div className="responsive-card-grid mt-5">
            {visiblePersonas.map((persona) => {
              const Icon = categoryIcon(persona.category);
              const active = persona.id === selectedId;
              return (
                <article
                  key={persona.id}
                  className={`content-card clickable-card flex h-full flex-col p-5 transition ${
                    active ? "border-[color-mix(in_srgb,var(--accent-2)_58%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))]" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)]">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className={`rounded-full border bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold ${difficultyTone(persona.difficulty)}`}>
                      {t.difficulties[persona.difficulty]}
                    </span>
                  </div>
                  <h2 className="ko-friendly mt-4 text-base font-semibold text-[var(--foreground)]">{isEn ? persona.roleEn : persona.roleKo}</h2>
                  <p className="ko-friendly mt-1 text-xs font-semibold text-[var(--accent-2)]">{t.categories[persona.category]}</p>
                  <p className="ko-friendly mt-3 flex-1 text-sm leading-6 text-[var(--muted)]">{isEn ? persona.summaryEn : persona.summaryKo}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(isEn ? persona.focusEn : persona.focusKo).slice(0, 3).map((area) => <span key={area} className="chip">{area}</span>)}
                  </div>
                  <button type="button" onClick={() => selectPersona(persona)} className="secondary-btn mt-4 justify-center px-3 py-2 text-xs">
                    {t.start}
                  </button>
                </article>
              );
            })}
          </div>
          {visiblePersonas.length === 0 ? <Notice className="mt-4">{t.noPersonas}</Notice> : null}
          {visibleCount < filteredPersonas.length ? (
            <button type="button" onClick={() => setVisibleCount((count) => count + 6)} className="secondary-btn mt-5 w-full justify-center px-4 py-3 text-sm">
              {t.loadMore}
            </button>
          ) : null}
        </PagePanel>

        <div className="grid gap-5">
          <PagePanel>
            <SectionTitle title={t.selected} description={isEn ? selectedPersona.styleEn : selectedPersona.styleKo} />
            <div className="responsive-card-grid mt-5">
              <MetricTile label={t.category} value={t.categories[selectedPersona.category]} helper={isEn ? selectedPersona.name : selectedPersona.name} />
              <MetricTile label={t.difficulty} value={t.difficulties[selectedPersona.difficulty]} helper={isEn ? selectedPersona.competitivenessEn : selectedPersona.competitivenessKo} />
            </div>
            <div className="content-card ko-friendly mt-5 p-5">
              <div className="flex items-center gap-2">
                <CategoryIcon size={18} className="text-[var(--accent-2)]" aria-hidden="true" />
                <p className="text-sm font-semibold text-[var(--foreground)]">{isEn ? selectedPersona.roleEn : selectedPersona.roleKo}</p>
              </div>
              <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">{t.lens}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">{isEn ? selectedPersona.attitudeEn : selectedPersona.attitudeKo}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {focusAreas.map((area) => <span key={area} className="accent-pill px-3 py-1 text-xs font-semibold">{area}</span>)}
              </div>
            </div>
            <Notice className="ko-friendly mt-5">{isEn ? "Evaluation also uses shared role skill frameworks and synthetic early-career examples." : "평가는 공통 직무 역량 프레임워크와 합성 신입 커리어 예시도 함께 반영합니다."}</Notice>
          </PagePanel>

          <PagePanel>
            <SectionTitle title={t.question} description={t.questionDesc} />
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} className="field mt-5 min-h-24" />
            <label className="mt-5 block">
              <span className="form-label">{t.answer}</span>
              <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} className="field min-h-48" placeholder={t.answerPlaceholder} />
            </label>
            <button type="button" onClick={evaluate} disabled={loading || !answer.trim()} className="primary-btn mt-4 px-5 py-3 text-sm disabled:opacity-60">
              <Play size={16} aria-hidden="true" />
              {loading ? t.evaluating : t.evaluate}
            </button>
            {error ? <Notice tone="warning" className="mt-4">{error}</Notice> : null}
          </PagePanel>
        </div>
      </section>

      {result ? (
        <section className="mt-5">
          <PagePanel>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionTitle title={t.result} />
              <span className="accent-pill w-fit px-3 py-1 text-xs font-semibold">
                <ClipboardCheck size={14} aria-hidden="true" />
                {result.evaluationId ? t.saved : result.source === "demo_fallback" ? t.demo : t.result}
              </span>
            </div>
            <div className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="grid gap-3">
                {result.roleData ? (
                  <Notice>
                    <strong>{t.roleDataNote}: </strong>
                    {result.roleData.sourceNote}
                  </Notice>
                ) : null}
                <Notice tone="success"><strong>{t.strengths}: </strong>{result.strengths.join(", ")}</Notice>
                <Notice tone="warning"><strong>{t.weaknesses}: </strong>{result.weaknesses.join(", ")}</Notice>
                <Notice><strong>{t.recommendations}: </strong>{result.recommendations.join(", ")}</Notice>
                <Notice><strong>{t.nextQuestion}: </strong>{result.nextPracticeQuestion}</Notice>
              </div>
              <div className="content-card p-5">
                <div className="responsive-card-grid">
                  <MetricTile label={t.overall} value={`${result.overallScore}/100`} />
                  <MetricTile label={t.passSignal} value={`${result.passProbability}%`} helper={t.estimated} />
                  {scoreRows(result, language).map((score) => (
                    <div key={score.label} className="content-card p-4">
                      <div className="mb-2 flex justify-between gap-3 text-sm font-semibold text-[var(--muted)]">
                        <span>{score.label}</span>
                        <span>{score.value}/100</span>
                      </div>
                      <div className="signal-bar"><div className="signal-fill" style={{ width: `${score.value}%` }} /></div>
                    </div>
                  ))}
                </div>
                {result.roleData ? (
                  <div className="ko-friendly mt-5">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{t.criteria}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[...result.roleData.requiredSkills, ...result.roleData.interviewFocus].slice(0, 10).map((item) => <span key={item} className="chip">{item}</span>)}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </PagePanel>
        </section>
      ) : null}
    </PageShell>
  );
}
