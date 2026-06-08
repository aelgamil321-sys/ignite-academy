import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "lesson-files";

export const Route = createFileRoute("/admin/upload-test")({
  head: () => ({
    meta: [
      { title: "Upload Test — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminUploadTestPage,
});

type UploadDebug = {
  fileName: string;
  fileSize: number;
  userEmail: string | null;
  isAuthenticated: boolean;
  userError: unknown;
  bucket: string;
  uploadPath: string;
  uploadData: unknown;
  uploadError: unknown;
  publicUrl: string | null;
  caughtError: string | null;
  phase: "uploading" | "done";
};

function toJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  try {
    return JSON.stringify(value, Object.getOwnPropertyNames(value as object), 2);
  } catch {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function AdminUploadTestPage() {
  const supabaseUrl = Boolean(
    import.meta.env.VITE_SUPABASE_URL || (typeof process !== "undefined" && process.env.SUPABASE_URL),
  );
  const supabaseAnonKey = Boolean(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      (typeof process !== "undefined" && process.env.SUPABASE_PUBLISHABLE_KEY),
  );

  const [email, setEmail] = useState<string>("—");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [debug, setDebug] = useState<UploadDebug | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setIsAuthenticated(!!data.user);
      setEmail(data.user?.email ?? "—");
      if (error) console.error("[upload-test] initial getUser error", error);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      setEmail(session?.user?.email ?? "—");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("File selected", file);

    const uploadPath = `test/${Date.now()}-${file.name}`;

    setDebug({
      fileName: file.name,
      fileSize: file.size,
      userEmail: null,
      isAuthenticated: false,
      userError: null,
      bucket: BUCKET,
      uploadPath,
      uploadData: null,
      uploadError: null,
      publicUrl: null,
      caughtError: null,
      phase: "uploading",
    });

    try {
      const { data: authData, error: userError } = await supabase.auth.getUser();
      const user = authData.user;
      const authed = !!user;

      console.log("[upload-test] getUser", { user, userError });

      setDebug((prev) =>
        prev
          ? {
              ...prev,
              userEmail: user?.email ?? null,
              isAuthenticated: authed,
              userError: userError ?? null,
            }
          : prev,
      );

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(uploadPath, file, { upsert: true });

      console.log("[upload-test] storage.upload", { data, error, uploadPath, bucket: BUCKET });

      let publicUrl: string | null = null;
      if (!error && data) {
        const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadPath);
        publicUrl = publicUrlData.publicUrl;
      }

      setDebug((prev) =>
        prev
          ? {
              ...prev,
              uploadData: data ?? null,
              uploadError: error ?? null,
              publicUrl,
              phase: "done",
            }
          : prev,
      );
    } catch (err) {
      const caughtError = err instanceof Error ? err.message : String(err);
      console.error("[upload-test] caught error", err);
      setDebug((prev) =>
        prev
          ? {
              ...prev,
              caughtError,
              phase: "done",
            }
          : prev,
      );
    } finally {
      e.target.value = "";
    }
  };

  const uploadErrorMsg = debug ? errorMessage(debug.uploadError) : null;
  const userErrorMsg = debug ? errorMessage(debug.userError) : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="font-display text-2xl text-primary">Storage Upload Test</h1>
      <p className="text-sm text-muted-foreground">
        Temporary page to test Supabase Storage uploads to the{" "}
        <code className="font-mono">{BUCKET}</code> bucket.
      </p>

      <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm font-mono">
        <div>
          <span className="text-muted-foreground">Current logged-in user email: </span>
          <span className="text-emerald break-all">{email}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Is authenticated: </span>
          <span className={isAuthenticated ? "text-emerald" : "text-destructive"}>
            {String(isAuthenticated)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Supabase URL exists: </span>
          <span className={supabaseUrl ? "text-emerald" : "text-destructive"}>{String(supabaseUrl)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Supabase anon key exists: </span>
          <span className={supabaseAnonKey ? "text-emerald" : "text-destructive"}>
            {String(supabaseAnonKey)}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-4 space-y-3">
        <label className="block text-sm font-semibold text-foreground">Choose a file</label>
        <input
          type="file"
          disabled={debug?.phase === "uploading"}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-xs file:font-semibold"
          onChange={(e) => {
            void handleFileChange(e);
          }}
        />

        {!debug && (
          <p className="text-sm text-muted-foreground italic">Select a file to run upload test.</p>
        )}

        {debug?.phase === "uploading" && (
          <p className="text-sm font-semibold text-primary">Uploading...</p>
        )}
      </div>

      {debug && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4 text-sm">
          <h2 className="font-display text-lg text-primary">Upload debug result</h2>

          <div className="grid gap-2 font-mono text-xs sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Selected file name: </span>
              <span className="break-all">{debug.fileName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Selected file size: </span>
              <span>{debug.fileSize} bytes</span>
            </div>
            <div>
              <span className="text-muted-foreground">User email (at upload): </span>
              <span className="break-all">{debug.userEmail ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Is authenticated (at upload): </span>
              <span className={debug.isAuthenticated ? "text-emerald" : "text-destructive"}>
                {String(debug.isAuthenticated)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Bucket name used: </span>
              <span>{debug.bucket}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Upload path used: </span>
              <span className="break-all">{debug.uploadPath}</span>
            </div>
          </div>

          {userErrorMsg && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
              <div className="font-semibold text-destructive">userError.message</div>
              <div className="mt-1 font-mono text-xs text-destructive break-all">{userErrorMsg}</div>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              storage.upload() — data (JSON)
            </div>
            <pre className="rounded-lg border border-border bg-background p-3 text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto">
              {toJson(debug.uploadData)}
            </pre>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              storage.upload() — error (JSON)
            </div>
            <pre className="rounded-lg border border-border bg-background p-3 text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto">
              {toJson(debug.uploadError)}
            </pre>
          </div>

          {uploadErrorMsg && (
            <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-3">
              <div className="font-semibold text-destructive">Upload failed</div>
              <div className="mt-1 font-mono text-sm text-destructive break-all">{uploadErrorMsg}</div>
            </div>
          )}

          {debug.caughtError && (
            <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-3">
              <div className="font-semibold text-destructive">Caught exception</div>
              <div className="mt-1 font-mono text-sm text-destructive break-all">{debug.caughtError}</div>
            </div>
          )}

          {debug.publicUrl && !uploadErrorMsg && (
            <div className="rounded-lg border-2 border-emerald bg-emerald/10 p-3">
              <div className="font-semibold text-emerald">Upload success — public URL</div>
              <a
                href={debug.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block font-mono text-sm text-emerald break-all underline"
              >
                {debug.publicUrl}
              </a>
            </div>
          )}

          {debug.phase === "done" && !uploadErrorMsg && !debug.caughtError && !debug.publicUrl && (
            <div className="rounded-lg border border-amber-500 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
              Upload finished with no error and no public URL — check data JSON above.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
