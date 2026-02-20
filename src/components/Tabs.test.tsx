/**
 * Tests for the Tabs navigation component.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs } from "./Tabs";
import '@testing-library/jest-dom';

describe("Tabs", () => {
  it("renders Dataset, Graders, Experiment tabs", () => {
    render(<Tabs active="dataset" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /dataset/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /graders/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /experiment/i })).toBeInTheDocument();
  });

  it("calls onChange when a tab is clicked", () => {
    const onChange = jest.fn();
    render(<Tabs active="dataset" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /graders/i }));
    expect(onChange).toHaveBeenCalledWith("graders");

    fireEvent.click(screen.getByRole("button", { name: /experiment/i }));
    expect(onChange).toHaveBeenCalledWith("experiment");
  });

  it("shows active tab with accent styling", () => {
    render(<Tabs active="graders" onChange={() => {}} />);
    const gradersBtn = screen.getByRole("button", { name: /graders/i });
    expect(gradersBtn).toHaveClass("border-[var(--accent)]");
  });
});
