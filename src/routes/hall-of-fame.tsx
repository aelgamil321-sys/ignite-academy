import { createFileRoute } from "@tanstack/react-router";
import { HallOfFamePage } from "@/components/hall-of-fame-page";

export const Route = createFileRoute("/hall-of-fame")({
  head: () => ({
    meta: [
      { title: "Hall of Fame — Ignite Islamic Academy" },
      {
        name: "description",
        content:
          "Celebrate top student achievements at Ignite Islamic Academy — quiz excellence, certificates, and grade champions.",
      },
      { property: "og:title", content: "Hall of Fame — Ignite Islamic Academy" },
      {
        property: "og:description",
        content: "Top students, student of the month, and grade champions at Ignite Islamic Academy.",
      },
      { property: "og:url", content: "https://ignite-academy.pages.dev/hall-of-fame" },
    ],
    links: [{ rel: "canonical", href: "https://ignite-academy.pages.dev/hall-of-fame" }],
  }),
  component: HallOfFamePage,
});
