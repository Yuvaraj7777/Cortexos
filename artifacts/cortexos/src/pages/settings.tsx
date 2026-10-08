import { UserProfile, useUser } from "@clerk/react";
import { Settings as SettingsIcon, Camera, Loader2 } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => {
    setError(null);
    fileRef.current?.click();
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setError(null);
    setUploading(true);
    try {
      await user.setProfileImage({ file });
      await user.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not upload that image. Try a JPG or PNG under 10MB.",
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight neon-text flex items-center gap-3">
        <SettingsIcon className="text-secondary" />
        Settings
      </h1>
      <p className="text-muted-foreground -mt-2">
        Manage your profile, account security, connected accounts, and active
        sessions.
      </p>

      {isLoaded && user && (
        <div className="glass-card rounded-2xl border border-white/10 p-6 bg-card/60 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <button
              type="button"
              onClick={openPicker}
              disabled={uploading}
              aria-label="Change profile photo"
              className="relative group h-24 w-24 shrink-0 rounded-full overflow-hidden border border-white/15 ring-2 ring-primary/30 transition hover:ring-primary/70 focus:outline-none focus:ring-primary/70 disabled:cursor-not-allowed"
            >
              <img
                src={user.imageUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition">
                <Camera className="h-6 w-6 text-white" />
              </span>
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </span>
              )}
            </button>

            <div className="text-center sm:text-left">
              <h2 className="text-lg font-bold">Profile photo</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Click your photo or the button below to upload a new one. Square
                images look best. JPG or PNG, up to 10MB.
              </p>
              <div className="mt-3 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={openPicker}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary/15 border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" /> Change photo
                    </>
                  )}
                </button>
                {error && (
                  <span className="text-sm text-destructive">{error}</span>
                )}
              </div>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      )}

      <div className="flex justify-center">
        <UserProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox:
                "w-full max-w-4xl border border-white/10 rounded-2xl bg-card/60 backdrop-blur-xl shadow-2xl",
              navbar: "border-r border-white/10",
              scrollBox: "bg-transparent",
            },
          }}
        />
      </div>
    </div>
  );
}
