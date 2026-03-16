import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
        <p className="mt-2 text-slate-600">로그인 후 사용자를 위한 기본 페이지입니다.</p>
        <div className="mt-4 flex gap-2">
          <Link href="/" className="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">홈으로</Link>
          <Link href="/login" className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">로그인</Link>
        </div>
      </div>
    </div>
  );
}
