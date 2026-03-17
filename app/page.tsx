import Link from "next/link";
import AuthControls from "@/components/auth-controls";
import HeroRotator from "@/components/hero-rotator";

export default function Home() {
  return (
    <div className="app-bg">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
        <section className="surface-card p-6 md:p-8">
          <div className="hero-grid">
            <div className="col-span-12 text-left md:col-span-7">
              <p className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                AI Career Intelligence
              </p>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
                취업 준비, 감이 아니라 데이터와 AI로.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
                상세 프로필을 기반으로 현실적인 매칭 점수를 계산하고, 실제 공고를 AI로 서칭해 바로 확인합니다.
                이력서를 넣으면 커버레터 초안까지 한 번에 생성합니다.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link className="primary-btn px-4 py-2.5 text-sm" href="/profile">
                  지금 시작하기
                </Link>
                <Link className="secondary-btn px-4 py-2.5 text-sm" href="/matching">
                  매칭 보기
                </Link>
                <Link className="secondary-btn px-4 py-2.5 text-sm" href="/cover-letter">
                  AI 커버레터
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="trust-chip">실공고 AI 1회 검색 + 캐시</span>
                <span className="trust-chip">프로필 상세 입력 기반</span>
                <span className="trust-chip">Supabase 인증/저장</span>
              </div>
            </div>

            <div className="col-span-12 text-left md:col-span-5">
              <HeroRotator />
              <div className="bento-card mt-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Live Snapshot</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="kpi-card">
                    <p className="kpi-label">매칭 방식</p>
                    <p className="kpi-value">Hybrid</p>
                  </div>
                  <div className="kpi-card">
                    <p className="kpi-label">공고 소스</p>
                    <p className="kpi-value">AI Search</p>
                  </div>
                  <div className="kpi-card col-span-2">
                    <p className="kpi-label">커버레터</p>
                    <p className="kpi-value">GPT-4o mini</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
                  로그인 후: 프로필 입력 · 채용매칭 · AI 커버레터 생성 흐름으로 바로 테스트 가능합니다.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="bento-card text-left md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Why This Works</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">실전 취업 관점에 맞춘 3단계 파이프라인</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">1. 상세 프로필</p>
                <p className="mt-1 text-xs text-slate-600">학교, GPA 만점 기준, 자격증, 어학, 프로젝트까지 입력</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">2. 채용 매칭</p>
                <p className="mt-1 text-xs text-slate-600">규칙 점수 + 실제 공고 AI 검색(최초 1회)</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">3. 지원 문서</p>
                <p className="mt-1 text-xs text-slate-600">이력서 텍스트로 커버레터 생성/저장/재생성</p>
              </div>
            </div>
          </article>

          <aside className="bento-card text-left">
            <p className="text-sm font-semibold text-slate-900">빠른 이동</p>
            <div className="mt-3 grid gap-2">
              <AuthControls variant="menu" />
              <Link className="secondary-btn px-3 py-2 text-sm" href="/my-info">
                내정보
              </Link>
              <Link className="secondary-btn px-3 py-2 text-sm" href="/dashboard">
                대시보드
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
          </aside>
        </section>
      </main>
    </div>
  );
}
