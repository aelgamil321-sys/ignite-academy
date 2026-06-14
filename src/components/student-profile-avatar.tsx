import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfilePhotoSignedUrl } from "@/lib/profile-photo";
import { cn } from "@/lib/utils";

type Props = {
  profilePhotoPath: string | null | undefined;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
};

export function StudentProfileAvatar({
  profilePhotoPath,
  alt = "",
  className,
  fallbackClassName,
}: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const url = await getProfilePhotoSignedUrl(profilePhotoPath);
      if (active) setPhotoUrl(url);
    })();

    return () => {
      active = false;
    };
  }, [profilePhotoPath]);

  return (
    <Avatar className={cn("h-14 w-14 rounded-2xl", className)}>
      {photoUrl ? <AvatarImage src={photoUrl} alt={alt} className="object-cover" /> : null}
      <AvatarFallback
        className={cn("rounded-2xl bg-primary/10 text-primary", fallbackClassName)}
      >
        <UserRound className="h-7 w-7" />
      </AvatarFallback>
    </Avatar>
  );
}
