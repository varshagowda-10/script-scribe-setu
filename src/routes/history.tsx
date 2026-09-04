import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadHistory, removeHistory, type HistoryItem } from "@/lib/history";

const TITLE = "Translation History — AksharaSetu";
const DESC = "Reopen manuscripts you have already translated with AksharaSetu.";

export const Route = createFileRoute("/history")({
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
  component: HistoryPage,
});

function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setItems(loadHistory());
  }, []);

  const reopen = (item: HistoryItem) => {
    window.sessionStorage.setItem("aksharasetu:reopen", JSON.stringify(item));
    navigate({ to: "/translate" });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">History</h1>
      <p className="mt-2 text-muted-foreground">Manuscripts you have translated on this device.</p>

      {items.length === 0 ? (
        <div className="panel mt-6 px-6 py-10 text-center">
          <p className="text-muted-foreground">No translations yet.</p>
          <Button asChild className="mt-4">
            <Link to="/translate">Start Translation</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li key={item.id} className="panel flex flex-wrap items-center gap-4 p-4">
              <img
                src={item.thumbnail}
                alt="Manuscript thumbnail"
                className="h-20 w-28 rounded-md border border-border object-cover"
              />
              <div className="min-w-[12rem] flex-1">
                <p className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
                <p className="mt-1 line-clamp-2 text-sm">
                  {item.result.english?.trim() || item.result.hosaKannada || "Translation"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => reopen(item)}>
                  <ArrowUpRight className="mr-1.5 h-4 w-4" /> Reopen
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Remove from history"
                  onClick={() => setItems(removeHistory(item.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
