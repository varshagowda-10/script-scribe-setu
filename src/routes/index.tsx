import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const TITLE = "AksharaSetu — Read Old Kannada Manuscripts";
const DESC =
  "Upload a Kannada palm-leaf manuscript and read it in old Kannada, modern Kannada and English.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const STEPS = [
  { title: "Upload", text: "Add a clear photograph of the manuscript leaf." },
  { title: "Read", text: "See the passage in old Kannada and in modern Kannada." },
  { title: "Understand", text: "Get an English translation, audio and a PDF copy." },
];

function Home() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <section className="text-center">
        <h1 className="text-5xl leading-tight sm:text-6xl">AksharaSetu</h1>
        <p className="mt-3 font-kannada text-2xl text-muted-foreground">ಅಕ್ಷರ ಸೇತು</p>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Read old Kannada palm-leaf manuscripts in modern Kannada and English.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/translate">Start Translation</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/about">Learn more</Link>
          </Button>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="panel px-5 py-6">
            <span className="font-display text-3xl text-accent">{i + 1}</span>
            <h2 className="mt-2 text-xl">{s.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
