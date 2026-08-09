import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BackgroundColorPicker } from "./BackgroundColorPicker";

describe("BackgroundColorPicker", () => {
  it("shows only common solid colors and keeps the custom picker", () => {
    render(
      <BackgroundColorPicker value="#ffffff" onChange={vi.fn()} />,
    );

    expect(screen.getByTitle("دڵخواز")).toBeInTheDocument();
    expect(screen.getByTitle("White")).toBeInTheDocument();
    expect(screen.getByTitle("Black")).toBeInTheDocument();
    expect(screen.getByTitle("Green")).toBeInTheDocument();
    expect(screen.getByTitle("Yellow")).toBeInTheDocument();

    expect(screen.queryByTitle("Aurora")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Coral Sunset")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Midnight")).not.toBeInTheDocument();
  });
});
