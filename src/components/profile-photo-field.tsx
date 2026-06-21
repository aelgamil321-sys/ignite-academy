import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PROFILE_PHOTO_ACCEPT, validateProfilePhotoFile } from "@/lib/profile-photo";

type Props = {
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
};

export function ProfilePhotoField({ file, onChange, required = false }: Props) {
  const { tr } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFileChange(next: File | null) {
    if (!next) {
      setError(null);
      onChange(null);
      return;
    }
    const validationError = validateProfilePhotoFile(next);
    if (validationError) {
      setError(tr("profile_photo_invalid"));
      onChange(null);
      return;
    }
    setError(null);
    onChange(next);
  }

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">
        {tr("auth_profile_photo")}
        {required ? " *" : ""}
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted/40">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Camera className="h-7 w-7" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept={PROFILE_PHOTO_ACCEPT}
            required={required && !file}
            className="sr-only"
            onChange={(e) => {
              const picked = e.target.files?.[0] ?? null;
              handleFileChange(picked);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold hover:border-primary hover:text-primary transition-colors"
          >
            <Camera className="h-3.5 w-3.5" />
            {file ? tr("profile_change_photo") : tr("profile_photo_choose")}
          </button>
          {file ? (
            <button
              type="button"
              onClick={() => {
                if (inputRef.current) inputRef.current.value = "";
                handleFileChange(null);
              }}
              className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
              {tr("profile_photo_remove")}
            </button>
          ) : null}
          <p className="text-xs text-muted-foreground">{tr("profile_photo_hint")}</p>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
