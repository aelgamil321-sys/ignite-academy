import { createFileRoute } from "@tanstack/react-router";
import { HallOfFamePage } from "@/components/hall-of-fame-page";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/hall-of-fame")({
  head: () =>
    publicPageHead({
      title: "GHIRAS | Hall of Fame",
      description:
        "Celebrate student achievements at GHIRAS — quiz excellence, certificates, and grade champions.",
      path: "/hall-of-fame",
      ogTitle: "GHIRAS | Hall of Fame",
      ogDescription: "Top students, student of the month, and grade champions at GHIRAS.",
    }),
  component: HallOfFamePage,
});
