import type { LucideIcon } from "lucide-react";
import { BarChart3, Code2, Compass, FlaskConical, Palette } from "lucide-react";

export type CareerThemeId = "builder" | "creative" | "analyst" | "researcher" | "global-explorer";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type NodeType = "event" | "skill" | "risk" | "reward" | "boss";
export type NextMoveLanguage = "ko" | "en";

export type GameStats = {
  salary: number;
  skill: number;
  burnout: number;
  network: number;
  reputation: number;
};

export type PlayerStats = {
  skill: number;
  network: number;
  portfolio: number;
  capital: number;
  resilience: number;
};

export type CareerTheme = {
  id: CareerThemeId;
  title: string;
  titleKo: string;
  subtitle: string;
  subtitleKo: string;
  description: string;
  descriptionKo: string;
  startingStats: PlayerStats;
  recommendedGoal: string;
  recommendedGoalKo: string;
  visualIcon: LucideIcon;
  accentClass: string;
};

export type PlayerStartingProfile = {
  id: string;
  themeId: CareerThemeId;
  title: string;
  titleKo: string;
  level: number;
  xp: number;
  actionPoints: number;
  focus: string;
  focusKo: string;
};

export type YearNode = {
  id: string;
  year: number;
  label: string;
  labelKo: string;
  status: "completed" | "active" | "locked";
  nodeType: NodeType;
  headline: string;
  headlineKo: string;
  x: number;
  y: number;
  branchesTo: string[];
};

export type EventCard = {
  id: string;
  title: string;
  titleKo: string;
  rarity: Rarity;
  year: number;
  description: string;
  descriptionKo: string;
  statChanges: string[];
  statChangesKo: string[];
  effects: Partial<GameStats>;
};

export type CareerAction = {
  id: string;
  title: string;
  titleKo: string;
  cost: number;
  type: "skill" | "network" | "portfolio" | "risk";
  description: string;
  descriptionKo: string;
  consequences: string[];
  consequencesKo: string[];
  effects: Partial<GameStats>;
};

export type YearScenario = {
  year: number;
  title: string;
  titleKo: string;
  prompt: string;
  promptKo: string;
  events: EventCard[];
  actions: CareerAction[];
};

export type RunSummary = {
  runTitle: string;
  runTitleKo: string;
  projectedEnding: string;
  projectedEndingKo: string;
  keyRisk: string;
  keyRiskKo: string;
};

export type RelationshipResource = {
  id: string;
  label: string;
  labelKo: string;
  statKey: keyof Pick<GameStats, "network" | "reputation" | "burnout">;
  note: string;
  noteKo: string;
};

export const startingGameStats: GameStats = {
  salary: 42,
  skill: 48,
  burnout: 20,
  network: 35,
  reputation: 32,
};

export const careerThemes: CareerTheme[] = [
  {
    id: "builder",
    title: "Builder",
    titleKo: "빌더",
    subtitle: "Code, products, startups",
    subtitleKo: "코드, 제품, 스타트업",
    description: "Software engineering, products, startups, and side projects.",
    descriptionKo: "소프트웨어 엔지니어링, 제품, 스타트업, 사이드 프로젝트 중심.",
    startingStats: { skill: 72, network: 42, portfolio: 68, capital: 36, resilience: 58 },
    recommendedGoal: "Ship a portfolio product and land a technical internship.",
    recommendedGoalKo: "포트폴리오 제품을 출시하고 기술 인턴십을 노리세요.",
    visualIcon: Code2,
    accentClass: "from-cyan-400/35 via-blue-500/20 to-slate-950",
  },
  {
    id: "creative",
    title: "Creative",
    titleKo: "크리에이티브",
    subtitle: "Studio, brand, portfolio",
    subtitleKo: "스튜디오, 브랜드, 포트폴리오",
    description: "Design, marketing, branding, content, and portfolio careers.",
    descriptionKo: "디자인, 마케팅, 브랜딩, 콘텐츠, 포트폴리오 커리어 중심.",
    startingStats: { skill: 64, network: 54, portfolio: 76, capital: 32, resilience: 62 },
    recommendedGoal: "Build a standout public portfolio and win client-style projects.",
    recommendedGoalKo: "눈에 띄는 공개 포트폴리오를 만들고 클라이언트형 프로젝트를 확보하세요.",
    visualIcon: Palette,
    accentClass: "from-pink-400/35 via-purple-500/20 to-slate-950",
  },
  {
    id: "analyst",
    title: "Analyst",
    titleKo: "애널리스트",
    subtitle: "Charts, strategy, operations",
    subtitleKo: "차트, 전략, 운영",
    description: "Data, finance, consulting, operations, and structured problem solving.",
    descriptionKo: "데이터, 금융, 컨설팅, 운영, 구조적 문제 해결 중심.",
    startingStats: { skill: 68, network: 48, portfolio: 52, capital: 46, resilience: 64 },
    recommendedGoal: "Turn data projects into decision memos and recruiting proof.",
    recommendedGoalKo: "데이터 프로젝트를 의사결정 메모와 채용 증거로 바꾸세요.",
    visualIcon: BarChart3,
    accentClass: "from-emerald-400/35 via-green-500/20 to-slate-950",
  },
  {
    id: "researcher",
    title: "Researcher",
    titleKo: "리서처",
    subtitle: "Labs, papers, graduate paths",
    subtitleKo: "연구실, 논문, 대학원 경로",
    description: "Graduate school, papers, labs, and academic career strategy.",
    descriptionKo: "대학원, 논문, 연구실, 학문 커리어 전략 중심.",
    startingStats: { skill: 70, network: 38, portfolio: 58, capital: 34, resilience: 74 },
    recommendedGoal: "Build research credibility and secure a lab or graduate pathway.",
    recommendedGoalKo: "연구 신뢰도를 쌓고 연구실 또는 대학원 경로를 확보하세요.",
    visualIcon: FlaskConical,
    accentClass: "from-violet-400/35 via-indigo-500/20 to-slate-950",
  },
  {
    id: "global-explorer",
    title: "Global Explorer",
    titleKo: "글로벌 탐험가",
    subtitle: "Relocation, maps, global firms",
    subtitleKo: "해외 취업, 이동, 글로벌 기업",
    description: "Overseas jobs, relocation, global companies, and cross-cultural leverage.",
    descriptionKo: "해외 취업, 이주, 글로벌 기업, 문화적 강점 중심.",
    startingStats: { skill: 58, network: 58, portfolio: 46, capital: 44, resilience: 72 },
    recommendedGoal: "Prepare a global-ready profile and target international openings.",
    recommendedGoalKo: "글로벌 지원용 프로필을 준비하고 해외 공고를 공략하세요.",
    visualIcon: Compass,
    accentClass: "from-amber-400/35 via-orange-500/20 to-slate-950",
  },
];

export const playerStartingProfiles: PlayerStartingProfile[] = [
  { id: "builder-start", themeId: "builder", title: "Indie Intern", titleKo: "인디 인턴", level: 1, xp: 0, actionPoints: 2, focus: "Build proof fast", focusKo: "빠르게 증거 만들기" },
  { id: "creative-start", themeId: "creative", title: "Portfolio Initiate", titleKo: "포트폴리오 입문자", level: 1, xp: 0, actionPoints: 2, focus: "Make work visible", focusKo: "작업물을 보이게 만들기" },
  { id: "analyst-start", themeId: "analyst", title: "Signal Mapper", titleKo: "시그널 매퍼", level: 1, xp: 0, actionPoints: 2, focus: "Turn data into decisions", focusKo: "데이터를 결정으로 바꾸기" },
  { id: "researcher-start", themeId: "researcher", title: "Lab Prospect", titleKo: "연구실 후보", level: 1, xp: 0, actionPoints: 2, focus: "Earn mentor trust", focusKo: "멘토 신뢰 얻기" },
  { id: "global-start", themeId: "global-explorer", title: "Map Runner", titleKo: "맵 러너", level: 1, xp: 0, actionPoints: 2, focus: "Open international paths", focusKo: "글로벌 경로 열기" },
];

export const baseYearNodes: YearNode[] = [
  { id: "y1-start", year: 1, label: "Year 1", labelKo: "1년차", status: "active", nodeType: "event", headline: "First Signal", headlineKo: "첫 신호", x: 10, y: 56, branchesTo: ["y2-skill", "y2-risk"] },
  { id: "y2-skill", year: 2, label: "Year 2", labelKo: "2년차", status: "locked", nodeType: "skill", headline: "Skill Fork", headlineKo: "스킬 분기", x: 31, y: 32, branchesTo: ["y3-reward"] },
  { id: "y2-risk", year: 2, label: "Year 2", labelKo: "2년차", status: "locked", nodeType: "risk", headline: "Risk Pivot", headlineKo: "리스크 전환", x: 31, y: 72, branchesTo: ["y3-reward", "y3-event"] },
  { id: "y3-reward", year: 3, label: "Year 3", labelKo: "3년차", status: "locked", nodeType: "reward", headline: "Offer Window", headlineKo: "오퍼 기회", x: 53, y: 28, branchesTo: ["y4-risk"] },
  { id: "y3-event", year: 3, label: "Year 3", labelKo: "3년차", status: "locked", nodeType: "event", headline: "Market Event", headlineKo: "시장 이벤트", x: 53, y: 66, branchesTo: ["y4-risk", "y4-skill"] },
  { id: "y4-risk", year: 4, label: "Year 4", labelKo: "4년차", status: "locked", nodeType: "risk", headline: "Burnout Check", headlineKo: "번아웃 체크", x: 74, y: 42, branchesTo: ["y5-boss"] },
  { id: "y4-skill", year: 4, label: "Year 4", labelKo: "4년차", status: "locked", nodeType: "skill", headline: "Specialize", headlineKo: "전문화", x: 74, y: 75, branchesTo: ["y5-boss"] },
  { id: "y5-boss", year: 5, label: "Year 5", labelKo: "5년차", status: "locked", nodeType: "boss", headline: "Endgame Offer", headlineKo: "최종 오퍼", x: 92, y: 54, branchesTo: [] },
];

const event = (
  id: string,
  year: number,
  rarity: Rarity,
  title: string,
  titleKo: string,
  description: string,
  descriptionKo: string,
  effects: Partial<GameStats>,
): EventCard => ({
  id,
  year,
  rarity,
  title,
  titleKo,
  description,
  descriptionKo,
  effects,
  statChanges: formatChanges(effects, "en"),
  statChangesKo: formatChanges(effects, "ko"),
});

const action = (
  id: string,
  type: CareerAction["type"],
  title: string,
  titleKo: string,
  description: string,
  descriptionKo: string,
  effects: Partial<GameStats>,
): CareerAction => ({
  id,
  type,
  title,
  titleKo,
  cost: 1,
  description,
  descriptionKo,
  effects,
  consequences: formatChanges(effects, "en"),
  consequencesKo: formatChanges(effects, "ko"),
});

export const yearScenarios: YearScenario[] = [
  {
    year: 1,
    title: "First Signal Window",
    titleKo: "첫 신호의 창",
    prompt: "You need proof before anyone takes your career direction seriously.",
    promptKo: "사람들이 당신의 커리어 방향을 진지하게 보기 전에 먼저 증거가 필요합니다.",
    events: [
      event("y1-mentor", 1, "rare", "Unexpected Mentor", "예상 밖의 멘토", "A senior reviews your work and offers blunt advice.", "선배가 작업물을 보고 날카로운 조언을 줍니다.", { network: 10, reputation: 6, burnout: 3 }),
      event("y1-project", 1, "common", "Proof Project", "증거 프로젝트", "A small project can become your first public signal.", "작은 프로젝트가 첫 공개 신호가 될 수 있습니다.", { skill: 8, reputation: 8, burnout: 4 }),
      event("y1-shortcut", 1, "epic", "Shortcut Invite", "지름길 초대", "A risky invite could accelerate your path.", "위험한 초대가 경로를 빠르게 앞당길 수 있습니다.", { salary: 6, network: 8, burnout: 10 }),
    ],
    actions: [
      action("y1-ship", "portfolio", "Ship a Public Artifact", "공개 결과물 출시", "Publish something small but finished.", "작지만 완성된 결과물을 공개합니다.", { skill: 8, reputation: 12, burnout: 6 }),
      action("y1-chat", "network", "Ask for 3 Reviews", "리뷰 3개 요청", "Get specific critique from people ahead of you.", "앞서 간 사람들에게 구체적인 피드백을 받습니다.", { network: 12, reputation: 4, burnout: 3 }),
      action("y1-study", "skill", "Skill Sprint", "스킬 스프린트", "Practice the one skill blocking your next step.", "다음 단계의 병목이 되는 스킬 하나를 훈련합니다.", { skill: 14, burnout: 7 }),
      action("y1-apply", "risk", "Apply Early", "조기 지원", "Test the market before you feel ready.", "준비됐다고 느끼기 전에 시장 반응을 확인합니다.", { salary: 4, network: 4, burnout: 8 }),
    ],
  },
  {
    year: 2,
    title: "Specialization Fork",
    titleKo: "전문화 분기",
    prompt: "Your general effort must become a visible lane.",
    promptKo: "흩어진 노력이 눈에 보이는 전문 영역으로 바뀌어야 합니다.",
    events: [
      event("y2-team", 2, "common", "Team Project", "팀 프로젝트", "A group project offers scope and friction.", "팀 프로젝트가 범위와 마찰을 동시에 줍니다.", { skill: 7, network: 7, burnout: 5 }),
      event("y2-recruiter", 2, "rare", "Recruiter Ping", "리크루터 연락", "A recruiter notices a keyword in your profile.", "리크루터가 프로필의 키워드 하나를 발견합니다.", { salary: 8, reputation: 8, burnout: 4 }),
      event("y2-crunch", 2, "epic", "Crunch Season", "크런치 시즌", "A brutal sprint could create a major proof point.", "강도 높은 스프린트가 큰 증거를 만들 수 있습니다.", { skill: 16, reputation: 12, burnout: 18 }),
    ],
    actions: [
      action("y2-focus", "skill", "Pick a Lane", "전문 영역 선택", "Commit to one track for the year.", "올해는 하나의 트랙에 집중합니다.", { skill: 14, reputation: 5 }),
      action("y2-mentor", "network", "Find a Mentor", "멘토 찾기", "Trade ego for faster feedback.", "자존심을 내려놓고 빠른 피드백을 얻습니다.", { network: 14, skill: 5, burnout: 2 }),
      action("y2-polish", "portfolio", "Polish Portfolio", "포트폴리오 다듬기", "Make your proof easier to understand.", "증거가 더 쉽게 이해되도록 다듬습니다.", { reputation: 14, salary: 4 }),
      action("y2-rest", "risk", "Take Recovery Week", "회복 주간", "Lose tempo now to avoid a collapse later.", "나중의 붕괴를 막기 위해 지금 속도를 늦춥니다.", { burnout: -14, network: 2 }),
    ],
  },
  {
    year: 3,
    title: "Conversion Year",
    titleKo: "전환의 해",
    prompt: "Proof must convert into interviews, offers, or stronger allies.",
    promptKo: "증거를 면접, 오퍼, 더 강한 조력자로 전환해야 합니다.",
    events: [
      event("y3-interview", 3, "rare", "Panel Interview", "패널 면접", "A serious interview tests your story under pressure.", "진지한 면접이 압박 속에서 당신의 스토리를 시험합니다.", { salary: 10, reputation: 8, burnout: 9 }),
      event("y3-peer", 3, "common", "Peer Referral", "동료 추천", "A peer opens a door you could not open alone.", "동료가 혼자서는 열 수 없던 문을 열어줍니다.", { network: 12, salary: 4 }),
      event("y3-public", 3, "legendary", "Public Breakthrough", "공개 돌파", "Your work gets noticed outside your usual circle.", "작업물이 기존 네트워크 밖에서도 주목받습니다.", { reputation: 22, salary: 12, burnout: 10 }),
    ],
    actions: [
      action("y3-stories", "skill", "Prepare 3 Stories", "스토리 3개 준비", "Turn messy experience into clean interview proof.", "복잡한 경험을 깔끔한 면접 증거로 바꿉니다.", { skill: 8, reputation: 8, burnout: 4 }),
      action("y3-referrals", "network", "Referral Push", "추천 요청", "Ask your network for specific openings.", "네트워크에 구체적인 공고 추천을 요청합니다.", { network: 10, salary: 8, burnout: 5 }),
      action("y3-case", "portfolio", "Case Study Upgrade", "케이스 스터디 개선", "Show the thinking behind your best work.", "가장 좋은 작업물 뒤의 사고 과정을 보여줍니다.", { reputation: 16, skill: 6, burnout: 5 }),
      action("y3-negotiate", "risk", "Negotiate Scope", "범위 협상", "Say no to shallow work and protect depth.", "얕은 일을 거절하고 깊이를 지킵니다.", { burnout: -8, reputation: 6, salary: 3 }),
    ],
  },
  {
    year: 4,
    title: "Pressure and Leverage",
    titleKo: "압박과 레버리지",
    prompt: "Your choices now decide whether momentum becomes leverage or burnout.",
    promptKo: "지금의 선택이 모멘텀을 레버리지로 만들지, 번아웃으로 만들지 결정합니다.",
    events: [
      event("y4-manager", 4, "rare", "Manager Champion", "매니저의 지지", "A manager starts advocating for your growth.", "매니저가 당신의 성장을 지지하기 시작합니다.", { reputation: 12, salary: 8, network: 5 }),
      event("y4-burnout", 4, "epic", "Burnout Warning", "번아웃 경고", "Your body starts charging interest on ambition.", "몸이 야망에 이자를 청구하기 시작합니다.", { burnout: 20, skill: -4 }),
      event("y4-offer", 4, "legendary", "Competing Offer", "경쟁 오퍼", "Another path appears with real money attached.", "실제 보상이 붙은 다른 경로가 나타납니다.", { salary: 20, reputation: 8, burnout: 8 }),
    ],
    actions: [
      action("y4-leverage", "risk", "Use Leverage", "레버리지 사용", "Ask for better scope, pay, or title.", "더 좋은 역할, 보상, 타이틀을 요청합니다.", { salary: 16, reputation: 6, burnout: 7 }),
      action("y4-teach", "network", "Teach Others", "다른 사람 가르치기", "Turn skill into status by helping peers.", "동료를 도우며 스킬을 지위로 바꿉니다.", { network: 12, reputation: 12, burnout: 4 }),
      action("y4-specialize", "skill", "Deep Specialization", "깊은 전문화", "Become hard to replace in one valuable area.", "가치 있는 영역 하나에서 대체하기 어려워집니다.", { skill: 18, salary: 8, burnout: 10 }),
      action("y4-boundary", "risk", "Set Boundaries", "경계 설정", "Protect your long game.", "장기전을 위해 회복력을 지킵니다.", { burnout: -18, reputation: -2 }),
    ],
  },
  {
    year: 5,
    title: "Endgame Offer",
    titleKo: "최종 오퍼",
    prompt: "The run ends with a final career outcome.",
    promptKo: "이제 최종 커리어 결과로 런이 마무리됩니다.",
    events: [
      event("y5-dream", 5, "legendary", "Dream Role Loop", "드림 롤 최종 라운드", "Your best path asks for one final performance.", "최고의 경로가 마지막 퍼포먼스를 요구합니다.", { salary: 18, reputation: 14, burnout: 12 }),
      event("y5-founder", 5, "epic", "Independent Path", "독립 경로", "You can choose autonomy over certainty.", "확실성보다 자율성을 택할 수 있습니다.", { reputation: 16, network: 8, salary: 6, burnout: 10 }),
      event("y5-stable", 5, "rare", "Stable Offer", "안정 오퍼", "A practical route rewards consistency.", "현실적인 경로가 꾸준함에 보상합니다.", { salary: 14, burnout: -4, reputation: 5 }),
    ],
    actions: [
      action("y5-close", "portfolio", "Close the Story", "스토리 마무리", "Package five years into a clear career narrative.", "5년의 경험을 명확한 커리어 서사로 묶습니다.", { reputation: 18, salary: 8 }),
      action("y5-negotiate", "risk", "Final Negotiation", "최종 협상", "Ask for what your run has earned.", "이번 런으로 얻어낸 가치를 요구합니다.", { salary: 18, burnout: 6 }),
      action("y5-allies", "network", "Activate Allies", "조력자 활성화", "Ask mentors and peers to open the last door.", "멘토와 동료에게 마지막 문을 열어달라고 요청합니다.", { network: 14, reputation: 8 }),
      action("y5-rest", "risk", "Choose Sustainable Pace", "지속 가능한 속도 선택", "Win without burning the next chapter.", "다음 챕터를 태우지 않고 승리합니다.", { burnout: -16, salary: 4 }),
    ],
  },
];

export const mockRelationshipResources: RelationshipResource[] = [
  { id: "mentor", label: "Mentor Trust", labelKo: "멘토 신뢰", statKey: "network", note: "Unlocks better advice cards.", noteKo: "더 좋은 조언 카드를 여는 자원입니다." },
  { id: "recruiter", label: "Recruiter Heat", labelKo: "리크루터 관심", statKey: "reputation", note: "Raises interview event odds.", noteKo: "면접 이벤트 확률을 높이는 신호입니다." },
  { id: "manager", label: "Manager Signal", labelKo: "매니저 신호", statKey: "reputation", note: "Needed for promotion routes.", noteKo: "승진 경로에 필요한 평판입니다." },
  { id: "peer", label: "Peer Network", labelKo: "동료 네트워크", statKey: "network", note: "Buffers bad events.", noteKo: "나쁜 이벤트를 완충하는 관계 자원입니다." },
  { id: "burnout", label: "Burnout Pressure", labelKo: "번아웃 압박", statKey: "burnout", note: "Too much pressure can end the run badly.", noteKo: "너무 높아지면 나쁜 엔딩으로 이어질 수 있습니다." },
];

export const mockRunSummary: RunSummary = {
  runTitle: "Five-Year Career Run",
  runTitleKo: "5년 커리어 런",
  projectedEnding: "Emerging Specialist",
  projectedEndingKo: "떠오르는 스페셜리스트",
  keyRisk: "Letting burnout climb above your career leverage.",
  keyRiskKo: "번아웃이 커리어 레버리지보다 높아지는 것.",
};

export function formatChanges(effects: Partial<GameStats>, language: NextMoveLanguage) {
  const labels: Record<keyof GameStats, string> =
    language === "en"
      ? { salary: "Salary", skill: "Skill", burnout: "Burnout", network: "Network", reputation: "Reputation" }
      : { salary: "연봉", skill: "스킬", burnout: "번아웃", network: "네트워크", reputation: "평판" };

  return (Object.entries(effects) as Array<[keyof GameStats, number]>).map(([key, value]) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value} ${labels[key]}`;
  });
}

export function clampStat(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function applyEffects(stats: GameStats, effects: Partial<GameStats>): GameStats {
  return {
    salary: clampStat(stats.salary + (effects.salary ?? 0)),
    skill: clampStat(stats.skill + (effects.skill ?? 0)),
    burnout: clampStat(stats.burnout + (effects.burnout ?? 0)),
    network: clampStat(stats.network + (effects.network ?? 0)),
    reputation: clampStat(stats.reputation + (effects.reputation ?? 0)),
  };
}
