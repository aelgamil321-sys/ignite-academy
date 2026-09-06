import { createFileRoute } from "@tanstack/react-router";
import { HallOfFamePage } from "@/components/hall-of-fame-page";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/hall-of-fame")({
  head: () =>
    publicPageHead({
      title: "Hall of Fame — Ignite Islamic Academy",
      description:
        "Celebrate student achievements at Ignite Islamic Academy — quiz excellence, certificates, and grade champions at Ignite School.",
      path: "/hall-of-fame",
      ogTitle: "Hall of Fame — Ignite Islamic Academy",
      ogDescription: "Top students, student of the month, and grade champions at Ignite Islamic Academy.",
    }),
  component: HallOfFamePage,
});
