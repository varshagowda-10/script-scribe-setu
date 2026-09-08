import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadLexicon, lexiconStatus } from "@/lib/admin.functions";

const TITLE = "Word list settings — AksharaSetu";
const DESC = "Private page for replacing the Hale Kannada to modern Kannada word list.";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage;
});

function AdminPage() {
  const [passphrase, setPassphrase] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    lexiconStatus()
      .then((r) => setCount(r.count))
      .catch(() => setCount(null));
  }, []);

  const onUpload = useCallback(async () => {
    if (!file || !passphrase) return;
    setBusy(true);
    try {
      const csv = await file.text();
      const res = await uploadLexicon({ data: { passphrase, csv } });
      setCount(res.count);
      toast.success(`${res.count.toLocaleString()} words are now in use`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }, [file, passphrase]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
      <Toaster position="top-center" />
      <div>
        <h1 className="text-4xl">Word list</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a two-column file of old Kannada words and their modern meanings. It replaces the
          list the translator currently uses.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Words in use right now:{" "}
          <span className="font-medium text-foreground">
            {count === null ? "…" : count.toLocaleString()}
          </span>
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="passphrase">
            Passphrase
          </label>
          <Input
            id="passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter the admin passphrase"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="csv">
            Word list file
          </label>
          <Input
            id="csv"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <Button onClick={onUpload} disabled={!file || !passphrase || busy}>
          {busy ? "Uploading…" : "Upload and use this list"}
        </Button>
      </div>
    </div>
  );
}
