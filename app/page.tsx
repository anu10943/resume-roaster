export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold text-orange-500">Resume Roaster</h1>
          <p className="text-gray-400 text-lg">Paste your resume and get brutally honest feedback.</p>
        </div>

        <textarea
          className="w-full h-64 bg-gray-900 border border-gray-700 rounded-xl p-4 text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:border-orange-500 transition-colors"
          placeholder="Paste your resume text here..."
        />

        <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
          Roast My Resume
        </button>
      </div>
    </main>
  );
}
