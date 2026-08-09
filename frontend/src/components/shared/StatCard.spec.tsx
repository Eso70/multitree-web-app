import { render, screen } from "@testing-library/react";
import { Activity } from "lucide-react";
import { describe, expect, it } from "vitest";
import { StatCard } from "@/components/shared/StatCard";

describe("StatCard", () => {
  it("renders the standard shared metric presentation", () => {
    render(
      <StatCard
        color="blue"
        icon={Activity}
        label="Total activity"
        value={1250}
      />,
    );

    expect(screen.getByText("1,250")).toBeInTheDocument();
    expect(screen.getByText("Total activity")).toBeInTheDocument();
  });

  it.each(["funnel", "live", "comparison", "story"] as const)(
    "preserves the %s presentation through a shared variant",
    (variant) => {
      const { container } = render(
        <StatCard label={`${variant} label`} value="42" variant={variant} />,
      );

      expect(container.querySelector("article")).toBeInTheDocument();
      expect(screen.getByText(`${variant} label`)).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    },
  );

  it("uses a skeleton matching its requested presentation while loading", () => {
    const { container } = render(
      <StatCard label="Live visitors" loading value={0} variant="live" />,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(container.querySelector(".border-emerald-200")).toBeInTheDocument();
    expect(screen.queryByText("Live visitors")).not.toBeInTheDocument();
  });
});
