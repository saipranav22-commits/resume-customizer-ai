import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryDrawer from "@/components/HistoryDrawer";
import * as api from "@/lib/api";
import { sampleHistoryItems, sampleHistoryDetail, sampleComparisonResponse } from "./testFixtures";

// Mock AuthContext
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-test-1", email: "test@example.com", full_name: "Test User" },
    token: "mock-valid-jwt-token",
    isLoading: false,
    isConfigured: true,
  }),
}));

// Mock API functions
vi.mock("@/lib/api", () => ({
  fetchHistory: vi.fn(),
  fetchHistoryDetail: vi.fn(),
  deleteHistory: vi.fn(),
  forkVersion: vi.fn(),
  updateVersionMetadata: vi.fn(),
  downloadVersionExport: vi.fn(),
  compareVersions: vi.fn(),
}));

describe("HistoryDrawer Component", () => {
  const mockOnClose = vi.fn();
  const mockOnLoadHistory = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchHistory).mockResolvedValue(sampleHistoryItems);
    vi.mocked(api.fetchHistoryDetail).mockResolvedValue(sampleHistoryDetail);
    vi.mocked(api.deleteHistory).mockResolvedValue(undefined);
    vi.mocked(api.compareVersions).mockResolvedValue(sampleComparisonResponse);
    vi.mocked(api.forkVersion).mockResolvedValue({
      ...sampleHistoryItems[0],
      id: "hist-fork-3",
      version_name: "v3 - Forked Variant",
      version_number: 3,
      parent_id: sampleHistoryItems[0].id,
    });
    vi.mocked(api.updateVersionMetadata).mockResolvedValue({
      ...sampleHistoryItems[0],
      version_name: "v1.1 - Updated Title",
      is_starred: false,
    });
    vi.mocked(api.downloadVersionExport).mockResolvedValue({
      blob: new Blob(["sample content"], { type: "application/pdf" }),
      filename: "Resume_Test.pdf",
    });

    // Mock URL methods for document export download triggers
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  it("renders loading state initially and then displays grouped revision families", async () => {
    render(
      <HistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        onLoadHistory={mockOnLoadHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Senior Backend Role")).toBeInTheDocument();
      expect(screen.getByText("Solutions Architect Role")).toBeInTheDocument();
    });

    expect(screen.getByText("2 revisions")).toBeInTheDocument();
    expect(screen.getByText("1 version")).toBeInTheDocument();

    expect(screen.getByText("v1.0 - Initial Customization")).toBeInTheDocument();
    expect(screen.getByText("v2.0 - Fintech Emphasis")).toBeInTheDocument();
  });

  it("renders empty state when no saved history items exist", async () => {
    vi.mocked(api.fetchHistory).mockResolvedValueOnce([]);

    render(
      <HistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        onLoadHistory={mockOnLoadHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("No Saved Resumes Yet")).toBeInTheDocument();
    });
  });

  it("handles and displays error message if history retrieval fails", async () => {
    vi.mocked(api.fetchHistory).mockRejectedValueOnce(new Error("Network connection failed"));

    render(
      <HistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        onLoadHistory={mockOnLoadHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Network connection failed")).toBeInTheDocument();
    });
  });

  it("filters items by keyword search", async () => {
    const user = userEvent.setup();
    render(
      <HistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        onLoadHistory={mockOnLoadHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Solutions Architect Role")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by title, version name/i);
    await user.type(searchInput, "Fintech");

    expect(screen.getByText("v2.0 - Fintech Emphasis")).toBeInTheDocument();
    expect(screen.queryByText("Solutions Architect Role")).not.toBeInTheDocument();
  });

  it("filters by starred/favorite status", async () => {
    const user = userEvent.setup();
    render(
      <HistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        onLoadHistory={mockOnLoadHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Solutions Architect Role")).toBeInTheDocument();
    });

    const favFilterBtn = screen.getByRole("button", { name: /Favorites Only/i });
    await user.click(favFilterBtn);

    // Only the starred item (Root 1) should remain
    expect(screen.getByText("v1.0 - Initial Customization")).toBeInTheDocument();
    expect(screen.queryByText("Solutions Architect Role")).not.toBeInTheDocument();
  });

  it("filters by tag pill click", async () => {
    const user = userEvent.setup();
    render(
      <HistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        onLoadHistory={mockOnLoadHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /architecture/i })).toBeInTheDocument();
    });

    const architectureTagBtn = screen.getByRole("button", { name: /architecture/i });
    await user.click(architectureTagBtn);

    expect(screen.getByText("Solutions Architect Role")).toBeInTheDocument();
    expect(screen.queryByText("v2.0 - Fintech Emphasis")).not.toBeInTheDocument();
  });

  it("toggles star status on a version item", async () => {
    const user = userEvent.setup();
    render(
      <HistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        onLoadHistory={mockOnLoadHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByTitle("Remove favorite")).toBeInTheDocument();
    });

    const starBtn = screen.getByTitle("Remove favorite");
    await user.click(starBtn);

    expect(api.updateVersionMetadata).toHaveBeenCalledWith(
      "mock-valid-jwt-token",
      "hist-root-1",
      { is_starred: false }
    );
  });

  it("restores a version into the active workspace", async () => {
    const user = userEvent.setup();
    render(
      <HistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        onLoadHistory={mockOnLoadHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("v1.0 - Initial Customization")).toBeInTheDocument();
    });

    // Find the restore button specifically inside the card for v1.0
    const card = screen.getByText("v1.0 - Initial Customization").closest(".group")!;
    const restoreBtn = within(card as HTMLElement).getByRole("button", { name: /Restore/i });
    await user.click(restoreBtn);

    expect(api.fetchHistoryDetail).toHaveBeenCalledWith("mock-valid-jwt-token", "hist-root-1");
    expect(mockOnLoadHistory).toHaveBeenCalledWith(sampleHistoryDetail);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("opens fork modal and creates a child revision", async () => {
    const user = userEvent.setup();
    render(
      <HistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        onLoadHistory={mockOnLoadHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("v1.0 - Initial Customization")).toBeInTheDocument();
    });

    const card = screen.getByText("v1.0 - Initial Customization").closest(".group")!;
    const forkBtn = within(card as HTMLElement).getByTitle("Fork / Duplicate version");
    await user.click(forkBtn);

    expect(screen.getByText("Duplicate / Fork Version")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/Senior Backend Role Variant/i);
    await user.clear(nameInput);
    await user.type(nameInput, "v3.0 - Forked Variant");

    const submitBtn = screen.getByRole("button", { name: /Create Fork/i });
    await user.click(submitBtn);

    expect(api.forkVersion).toHaveBeenCalledWith(
      "mock-valid-jwt-token",
      "hist-root-1",
      expect.objectContaining({ new_version_name: "v3.0 - Forked Variant" })
    );
  });

  it("opens rename modal and updates version metadata", async () => {
    const user = userEvent.setup();
    render(
      <HistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        onLoadHistory={mockOnLoadHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("v1.0 - Initial Customization")).toBeInTheDocument();
    });

    const card = screen.getByText("v1.0 - Initial Customization").closest(".group")!;
    const editBtn = within(card as HTMLElement).getByTitle("Rename or edit metadata");
    await user.click(editBtn);

    expect(screen.getByText("Edit Version Metadata")).toBeInTheDocument();

    const titleInput = screen.getByDisplayValue("Senior Backend Role");
    await user.clear(titleInput);
    await user.type(titleInput, "Senior Principal Engineer");

    const saveChangesBtn = screen.getByRole("button", { name: /Save Changes/i });
    await user.click(saveChangesBtn);

    expect(api.updateVersionMetadata).toHaveBeenCalledWith(
      "mock-valid-jwt-token",
      "hist-root-1",
      expect.objectContaining({ title: "Senior Principal Engineer" })
    );
  });

  it("opens delete confirmation and safely deletes version with reparenting notice", async () => {
    const user = userEvent.setup();
    render(
      <HistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        onLoadHistory={mockOnLoadHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("v1.0 - Initial Customization")).toBeInTheDocument();
    });

    const card = screen.getByText("v1.0 - Initial Customization").closest(".group")!;
    const deleteBtn = within(card as HTMLElement).getByTitle("Delete version");
    await user.click(deleteBtn);

    expect(screen.getByText("Confirm Version Deletion")).toBeInTheDocument();
    expect(screen.getByText(/Any existing child versions will not be deleted/i)).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole("button", { name: "Delete Version" });
    await user.click(confirmDeleteBtn);

    expect(api.deleteHistory).toHaveBeenCalledWith("mock-valid-jwt-token", "hist-root-1");
  });

  it("supports selecting exactly two versions for comparison and launches comparison modal", async () => {
    const user = userEvent.setup();
    render(
      <HistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        onLoadHistory={mockOnLoadHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("v1.0 - Initial Customization")).toBeInTheDocument();
    });

    const compareCheckboxes = screen.getAllByTitle("Select for side-by-side comparison");
    expect(compareCheckboxes.length).toBeGreaterThanOrEqual(2);

    // Select first version (A)
    await user.click(compareCheckboxes[0]);
    expect(screen.getByText("1 of 2 selected for comparison")).toBeInTheDocument();

    // Select second version (B)
    await user.click(compareCheckboxes[1]);
    expect(screen.getByText("Compare (2 selected)")).toBeInTheDocument();

    // Launch comparison
    const compareLaunchBtn = screen.getByRole("button", { name: /Compare \(2 selected\)/i });
    await user.click(compareLaunchBtn);

    expect(screen.getByText("Resume Version Comparison")).toBeInTheDocument();
    await waitFor(() => {
      expect(api.compareVersions).toHaveBeenCalled();
    });
  });

  it("triggers export in PDF, DOCX, and TXT formats", async () => {
    const user = userEvent.setup();
    render(
      <HistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        onLoadHistory={mockOnLoadHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("v1.0 - Initial Customization")).toBeInTheDocument();
    });

    const card = screen.getByText("v1.0 - Initial Customization").closest(".group")!;
    const pdfBtn = within(card as HTMLElement).getByTitle("Export PDF");
    await user.click(pdfBtn);
    expect(api.downloadVersionExport).toHaveBeenCalledWith("mock-valid-jwt-token", "hist-root-1", "pdf");

    const docxBtn = within(card as HTMLElement).getByTitle("Export DOCX");
    await user.click(docxBtn);
    expect(api.downloadVersionExport).toHaveBeenCalledWith("mock-valid-jwt-token", "hist-root-1", "docx");

    const txtBtn = within(card as HTMLElement).getByTitle("Export TXT");
    await user.click(txtBtn);
    expect(api.downloadVersionExport).toHaveBeenCalledWith("mock-valid-jwt-token", "hist-root-1", "txt");
  });

  it("closes drawer on Escape key press", async () => {
    const user = userEvent.setup();
    render(
      <HistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        onLoadHistory={mockOnLoadHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Resume Version History")).toBeInTheDocument();
    });

    await user.keyboard("{Escape}");
    expect(mockOnClose).toHaveBeenCalled();
  });
});
