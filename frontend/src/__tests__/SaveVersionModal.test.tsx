import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SaveVersionModal from "@/components/SaveVersionModal";

describe("SaveVersionModal Component", () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <SaveVersionModal
        isOpen={false}
        onClose={mockOnClose}
        jobDescription="Seeking Senior Python Engineer"
        activeVersionId={null}
        activeVersionName={null}
        activeVersionNumber={null}
        isSaving={false}
        onSave={mockOnSave}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders with new root defaults when activeVersionId is null", () => {
    render(
      <SaveVersionModal
        isOpen={true}
        onClose={mockOnClose}
        candidateName="Alex Morgan"
        jobDescription="Seeking Senior Python Engineer with cloud experience"
        activeVersionId={null}
        activeVersionName={null}
        activeVersionNumber={null}
        isSaving={false}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByRole("heading", { name: "Save Resume Version" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alex Morgan - Seeking Senior Python Engineer with cloud exp")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Seeking Senior Python Engineer with cloud exp Tailored")).toBeInTheDocument();
    // Lineage choices are hidden when not branching from an active version
    expect(screen.queryByText("Child Revision")).not.toBeInTheDocument();
  });

  it("renders lineage choices and defaults to Child Revision when activeVersionId exists", () => {
    render(
      <SaveVersionModal
        isOpen={true}
        onClose={mockOnClose}
        candidateName="Alex Morgan"
        jobDescription="Senior Python Backend"
        activeVersionId="hist-root-1"
        activeVersionName="v1.0 - Initial Customization"
        activeVersionNumber={1}
        isSaving={false}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText("Revision Lineage Choice")).toBeInTheDocument();
    expect(screen.getByText("Child Revision")).toBeInTheDocument();
    expect(screen.getByText("New Root (v1)")).toBeInTheDocument();
    expect(screen.getByText(/Active snapshot:/i)).toBeInTheDocument();
    expect(screen.getByText("v1.0 - Initial Customization")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Revision v2")).toBeInTheDocument();
  });

  it("allows switching between Child Revision and New Root", async () => {
    const user = userEvent.setup();
    render(
      <SaveVersionModal
        isOpen={true}
        onClose={mockOnClose}
        candidateName="Alex Morgan"
        jobDescription="Senior Python Backend"
        activeVersionId="hist-root-1"
        activeVersionName="v1.0 - Initial Customization"
        activeVersionNumber={1}
        isSaving={false}
        onSave={mockOnSave}
      />
    );

    const newRootBtn = screen.getByRole("button", { name: /New Root \(v1\)/i });
    await user.click(newRootBtn);

    const submitBtn = screen.getByRole("button", { name: /Save Resume Version/i });
    await user.click(submitBtn);

    // parent_id should be null when New Root is chosen
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        parent_id: null,
      })
    );
  });

  it("submits version data including version name, title, notes, and tags", async () => {
    const user = userEvent.setup();
    render(
      <SaveVersionModal
        isOpen={true}
        onClose={mockOnClose}
        candidateName="Alex Morgan"
        jobDescription="Senior Python Backend"
        activeVersionId="hist-root-1"
        activeVersionName="v1.0 - Initial Customization"
        activeVersionNumber={1}
        isSaving={false}
        onSave={mockOnSave}
      />
    );

    const nameInput = screen.getByDisplayValue("Revision v2");
    await user.clear(nameInput);
    await user.type(nameInput, "Revision v2.1 - Fintech Focus");

    const notesInput = screen.getByPlaceholderText(/Document specific adjustments/i);
    await user.type(notesInput, "Focused on Kafka event streams");

    const tagsInput = screen.getByPlaceholderText(/e\.g\. backend, cloud, python/i);
    await user.type(tagsInput, "kafka, fintech, backend");

    const submitBtn = screen.getByRole("button", { name: /Save Resume Version/i });
    await user.click(submitBtn);

    expect(mockOnSave).toHaveBeenCalledWith({
      title: "Alex Morgan - Senior Python Backend",
      version_name: "Revision v2.1 - Fintech Focus",
      parent_id: "hist-root-1",
      version_notes: "Focused on Kafka event streams",
      version_tags: ["kafka", "fintech", "backend"],
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("validates required fields before submitting", async () => {
    const user = userEvent.setup();
    render(
      <SaveVersionModal
        isOpen={true}
        onClose={mockOnClose}
        candidateName="Alex Morgan"
        jobDescription="Senior Python Backend"
        activeVersionId="hist-root-1"
        activeVersionName="v1.0 - Initial Customization"
        activeVersionNumber={1}
        isSaving={false}
        onSave={mockOnSave}
      />
    );

    const nameInput = screen.getByDisplayValue("Revision v2");
    await user.clear(nameInput);

    const submitBtn = screen.getByRole("button", { name: /Save Resume Version/i });
    expect(submitBtn).toBeDisabled();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("displays error banner when onSave rejects", async () => {
    const user = userEvent.setup();
    mockOnSave.mockRejectedValueOnce(new Error("Database version conflict (409)"));

    render(
      <SaveVersionModal
        isOpen={true}
        onClose={mockOnClose}
        candidateName="Alex Morgan"
        jobDescription="Senior Python Backend"
        activeVersionId="hist-root-1"
        activeVersionName="v1.0 - Initial Customization"
        activeVersionNumber={1}
        isSaving={false}
        onSave={mockOnSave}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Save Resume Version/i });
    await user.click(submitBtn);

    expect(screen.getByText("Database version conflict (409)")).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("closes on Escape key press", async () => {
    const user = userEvent.setup();
    render(
      <SaveVersionModal
        isOpen={true}
        onClose={mockOnClose}
        jobDescription="Senior Python Backend"
        activeVersionId={null}
        activeVersionName={null}
        activeVersionNumber={null}
        isSaving={false}
        onSave={mockOnSave}
      />
    );

    await user.keyboard("{Escape}");
    expect(mockOnClose).toHaveBeenCalled();
  });
});
