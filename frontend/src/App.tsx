import { useEffect, useState } from "react";

function App() {
  const [health, setHealth] = useState<string>("Loading...");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setHealth(data.status);
      })
      .catch(() => {
        setHealth("offline");
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12">
          <h1 className="text-4xl font-semibold">Laser & 3D Print Job Tracker</h1>
          <p className="mt-3 text-slate-400">
            Manage jobs, materials, costs, and production workflows in one place.
          </p>
        </header>

        <section className="grid gap-6 sm:grid-cols-2">
          <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/20">
            <h2 className="text-2xl font-semibold">Backend status</h2>
            <p className="mt-4 text-slate-300">Health: {health}</p>
          </article>

          <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/20">
            <h2 className="text-2xl font-semibold">Next steps</h2>
            <ul className="mt-4 space-y-2 text-slate-300">
              <li>- Build job management pages</li>
              <li>- Add material inventory UI</li>
              <li>- Implement file uploads</li>
            </ul>
          </article>
        </section>
      </div>
    </div>
  );
}

export default App;
