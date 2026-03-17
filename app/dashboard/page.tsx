import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="app-bg px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Dashboard</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">커리어 대시보드</h1>
          <p className="mt-2 text-sm text-slate-600">프로필을 업데이트하고, 현재 스펙 기준 매칭 결과를 확인하세요.</p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Link href="/profile" className="surface-card p-4 hover:border-blue-300">
              <p className="text-sm font-semibold text-slate-900">프로필 설정</p>
              <p className="mt-1 text-xs text-slate-600">학력, 스킬, 자격증, 인턴 정보를 입력합니다.</p>
            </Link>
            <Link href="/matching" className="surface-card p-4 hover:border-blue-300">
              <p className="text-sm font-semibold text-slate-900">채용 매칭</p>
              <p className="mt-1 text-xs text-slate-600">규칙 기반 점수로 현실적인 포지션을 추천합니다.</p>
            </Link>
            <Link href="/my-info" className="surface-card p-4 hover:border-blue-300">
              <p className="text-sm font-semibold text-slate-900">내정보</p>
              <p className="mt-1 text-xs text-slate-600">프로필 사진, 닉네임, 회원 정보를 확인합니다.</p>
            </Link>
            <Link href="/cover-letter" className="surface-card p-4 hover:border-blue-300">
              <p className="text-sm font-semibold text-slate-900">AI 커버레터</p>
              <p className="mt-1 text-xs text-slate-600">이력서 텍스트로 자기소개서 초안을 생성하고 저장합니다.</p>
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/" className="secondary-btn px-4 py-2 text-sm">
              홈으로
            </Link>
            <Link href="/profile" className="primary-btn px-4 py-2 text-sm">
              프로필 작성
            </Link>
            <Link href="/my-info" className="secondary-btn px-4 py-2 text-sm">
              내정보
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
