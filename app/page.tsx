import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow">
        <h1 className="text-3xl font-bold text-slate-900">AI Career Helper</h1>
        <p className="mt-2 text-slate-600">3월 18일까지 로그인/회원가입 + Supabase 연결 완료 (기본 구현).</p>
        <div className="mt-4 space-y-2">
          <Link className="inline-block rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700" href="/login">로그인</Link>
          <Link className="inline-block rounded border border-indigo-600 px-4 py-2 text-indigo-700 hover:bg-indigo-50" href="/register">회원가입</Link>
          <Link className="inline-block rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50" href="/dashboard">대시보드</Link>
        </div>
        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold">개발 체크리스트</p>
          <ul className="mt-1 list-disc pl-5 text-slate-600">
            <li>Google OAuth + 이메일/비밀번호 로그인</li>
            <li>Supabase 인증 연결</li>
            <li>기본 대시보드 라우트</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
