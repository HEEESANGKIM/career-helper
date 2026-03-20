import Link from "next/link";
import AuthControls from "@/components/auth-controls";
import HeroRotator from "@/components/hero-rotator";

export default function Home() {
  return (
    <div className="app-bg">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
        <section className="surface-card reveal-up p-6 md:p-8">
          <div className="hero-grid">
            <div className="col-span-12 text-left">
              <p className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">AI Career Intelligence</p>
              <div className="mt-4">
                <HeroRotator mode="hero" />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link className="primary-btn px-4 py-2.5 text-sm" href="/profile">
                  프로필 세팅 시작
                </Link>
                <Link className="secondary-btn px-4 py-2.5 text-sm" href="/matching">
                  실시간 매칭 보기
                </Link>
                <Link className="secondary-btn px-4 py-2.5 text-sm" href="/cover-letter">
                  자소서 엔진 실행
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="trust-chip">실공고 기반 AI 선별</span>
                <span className="trust-chip">프로필 핏 점수 자동 계산</span>
                <span className="trust-chip">문서 생성부터 면접 대비까지</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-12">
          <div className="grid gap-4 md:col-span-8">
            <article className="bento-card stagger-item stagger-1 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Core Workflow</p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">합격 확률을 끌어올리는 3단계 루틴</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" aria-hidden />
                    <p className="text-sm font-semibold text-slate-900">1. 프로필 정밀 세팅</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">학력, 전공, 자격, 어학, 프로젝트를 한 번에 구조화해 검색 가능한 경쟁력으로 만듭니다.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" aria-hidden />
                    <p className="text-sm font-semibold text-slate-900">2. 채용 핏 스코어링</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">규칙 점수와 AI 분석을 합쳐 공고별 적합도와 우선순위를 실전형 숫자로 제공합니다.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" aria-hidden />
                    <p className="text-sm font-semibold text-slate-900">3. 지원 문서 고도화</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">자소서 초안 생성부터 톤 튜닝, 재생성까지 빠르게 반복해 제출 품질을 단단하게 완성합니다.</p>
                </div>
              </div>
            </article>

            <article className="bento-card stagger-item stagger-2 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Execution Checklist</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">오늘 바로 점수 올리는 4가지 액션</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">프로필에서 학력, 전공, 자격, 어학 점수를 먼저 입력해 기준 데이터를 완성하기</div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">채용 매칭에서 실공고 탐색을 실행하고 상위 추천 직무부터 우선 확인하기</div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">AI 커버레터에서 초안을 만든 뒤 톤 재생성으로 더 설득력 있는 버전 비교하기</div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">시뮬레이터에서 지원-서류-면접 흐름을 리허설하며 약한 구간 보완하기</div>
              </div>
            </article>
          </div>

          <aside className="grid gap-4 md:col-span-4">
            <div className="bento-card stagger-item stagger-3 text-left">
              <p className="text-sm font-semibold text-slate-900">빠른 이동</p>
              <div className="mt-3 grid gap-2">
                <AuthControls variant="menu" />
                <Link className="secondary-btn px-3 py-2 text-sm" href="/my-info">
                  내 정보
                </Link>
                <Link className="secondary-btn px-3 py-2 text-sm" href="/dashboard">
                  커리어 대시보드
                </Link>
                <Link className="secondary-btn px-3 py-2 text-sm" href="/profile">
                  프로필 설정
                </Link>
                <Link className="secondary-btn px-3 py-2 text-sm" href="/matching">
                  채용 매칭
                </Link>
                <Link className="secondary-btn px-3 py-2 text-sm" href="/cover-letter">
                  AI 커버레터
                </Link>
              </div>
            </div>

            <div className="bento-card stagger-item stagger-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Featured</p>
              <h3 className="mt-2 text-sm font-semibold text-slate-900">실전 채용 시뮬레이터</h3>
              <p className="mt-2 text-xs text-slate-600">
                기업형 가상 공고에 지원하고 서류, 자소서, 면접, 최종 결과까지 한 번에 리허설해 실제 지원 전에 약점을 선제 보완할 수 있습니다.
              </p>
              <div className="mt-3">
                <Link href="/simulator" className="primary-btn inline-block px-3 py-2 text-xs">
                  시뮬레이터 시작
                </Link>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
