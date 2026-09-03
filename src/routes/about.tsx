import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const TITLE = "About AksharaSetu — Reading Old Kannada Manuscripts";
const DESC =
  "AksharaSetu helps make historical Kannada palm-leaf manuscripts easier to read by converting Hale Kannada into modern Kannada and English.";

export const Route = createFileRoute("/about")({
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
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">About AksharaSetu</h1>
      <div className="panel mt-6 space-y-4 px-6 py-6 text-base leading-relaxed">
        <p>
          AksharaSetu helps make historical Kannada palm-leaf manuscripts easier to read. Upload a
          photograph of a manuscript and it gives you the old Kannada reading, the same passage in
          modern Kannada, and a natural English translation.
        </p>
        <p>
          Much of Karnataka&apos;s written heritage survives on fragile palm leaves in Hale Kannada,
          a script and vocabulary that most readers today cannot follow. AksharaSetu is a bridge —
          <span className="font-kannada"> ಅಕ್ಷರ ಸೇತು</span> — between that older writing and the
          language people read now.
        </p>
        <p>
          Readings are produced from the manuscript image itself and checked against a large Hale
          Kannada to Hosa Kannada word list. Some words on damaged or faded leaves cannot be
          recovered with certainty, so results are best treated as a reading aid rather than a
          final scholarly edition.
        </p>
      </div>
      <div className="mt-6">
        <Button asChild size="lg">
          <Link to="/translate">Start Translation</Link>
        </Button>
      </div>
    </div>
  );
}
