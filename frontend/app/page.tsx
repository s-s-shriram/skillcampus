const modules = [
  ["💻", "Coding", "Practice programming, DSA and SQL problems."],
  ["🧠", "Aptitude", "Build quantitative, logical and verbal skills."],
  ["📝", "Tests", "Take timed tests created by faculty and admins."],
  ["🏆", "Contests", "Compete with students and climb the leaderboard."],
];

export default function Home() {
  return (
    <main>
      <section style={{ padding: "72px 0", background: "white" }}>
        <div className="container">
          <p style={{ fontWeight: 700, marginBottom: 12 }}>SKILLCAMPUS</p>
          <h1 style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", lineHeight: 1.02, maxWidth: 850, margin: 0 }}>
            Learn. Practice. Compete. Get Placement Ready.
          </h1>
          <p style={{ maxWidth: 700, fontSize: 20, lineHeight: 1.6, color: "#5d6678", marginTop: 24 }}>
            An all-in-one college platform for coding, aptitude, tests, contests and placement preparation.
          </p>
        </div>
      </section>

      <section className="container" style={{ padding: "48px 0" }}>
        <h2>SkillCampus MVP</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18, marginTop: 24 }}>
          {modules.map(([icon, title, description]) => (
            <article key={title} style={{ background: "white", padding: 24, borderRadius: 16, border: "1px solid #e5e9f0" }}>
              <div style={{ fontSize: 32 }}>{icon}</div>
              <h3>{title}</h3>
              <p style={{ color: "#667085", lineHeight: 1.5 }}>{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
