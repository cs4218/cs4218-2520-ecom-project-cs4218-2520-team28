import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoryForm from "../../components/Form/CategoryForm";

// Chi Thanh, A0276229W
// AI Assistance: Github Copilot (GPT-5.3-Codex)
// Frontend integration coverage for CategoryForm using a controlled parent harness.
// Scope:
// 1) Prop wiring (value / setValue)
// 2) Submission behavior (button + Enter key)
// 3) Accessibility-focused interaction (focus retention)
// 4) Form submission default prevention through submit handler path

function renderWithControlledParent({
  initialValue = "",
  onSubmit = () => {},
} = {}) {
  // Harness mirrors real parent behavior where state lives outside CategoryForm.
  function Harness() {
    const [value, setValue] = useState(initialValue);

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(e, value);
    };

    return (
      <CategoryForm
        handleSubmit={handleSubmit}
        value={value}
        setValue={setValue}
      />
    );
  }

  return render(<Harness />);
}

describe("CategoryForm integration", () => {
  // Validate initial prop-to-input synchronization.
  test("renders input with initial value prop", () => {
    renderWithControlledParent({ initialValue: "Electronics" });

    expect(screen.getByPlaceholderText("Enter new category")).toHaveValue(
      "Electronics"
    );
  });

  // Verify onChange flows through setValue and re-renders controlled input value.
  test("updates value through setValue callback on change", () => {
    renderWithControlledParent({ initialValue: "" });

    const input = screen.getByPlaceholderText("Enter new category");
    fireEvent.change(input, { target: { value: "Books" } });

    expect(input).toHaveValue("Books");
  });

  // Ensure submit button path triggers parent submit logic.
  test("submits when Submit button is clicked", async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup ? userEvent.setup() : userEvent;

    renderWithControlledParent({ initialValue: "Sports", onSubmit });

    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][1]).toBe("Sports");
  });

  // Ensure keyboard-driven submit remains supported.
  test("submits when Enter key is pressed in input", async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup ? userEvent.setup() : userEvent;

    renderWithControlledParent({ initialValue: "Clothing", onSubmit });

    const input = screen.getByPlaceholderText("Enter new category");
    input.focus();
    await user.type(input, "{enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][1]).toBe("Clothing");
  });

  // Basic accessibility check: input focus should not be lost during typing.
  test("keeps input focus after typing for accessibility", () => {
    renderWithControlledParent({ initialValue: "" });

    const input = screen.getByPlaceholderText("Enter new category");
    input.focus();
    fireEvent.change(input, { target: { value: "Garden" } });

    expect(input).toHaveFocus();
  });

  // Confirm the submit flow prevents full-page browser form submission.
  test("submit path prevents default browser form behavior", async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup ? userEvent.setup() : userEvent;

    renderWithControlledParent({ initialValue: "Toys", onSubmit });

    await user.click(screen.getByRole("button", { name: /submit/i }));

    const eventArg = onSubmit.mock.calls[0][0];
    expect(eventArg.defaultPrevented).toBe(true);
  });
});
