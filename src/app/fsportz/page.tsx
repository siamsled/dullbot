export default function FSportzLanding() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-6">
          FSportz
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
          The project has been scaffolded successfully and deployed to Vercel.
        </p>
        <div className="animate-pulse flex space-x-4 justify-center">
          <div className="h-3 w-3 bg-emerald-500 rounded-full"></div>
          <div className="h-3 w-3 bg-cyan-500 rounded-full"></div>
          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
