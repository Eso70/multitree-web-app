import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTheme } from "@/lib/contexts/ThemeProvider";
import {
  addClientAccessDemoInvitation,
  clearClientAccessDemoInvitations,
  createClientAccessDemoInvitation,
} from "../mock-store";
import ClientInvitationEditorDemo from "./ClientInvitationEditorDemo";

vi.mock(
  "@/features/link-editor/components/ReusableLinktreeEditorModal",
  () => ({
    ReusableLinktreeEditorModal: ({ isOpen }: { isOpen: boolean }) => {
      useTheme();
      return isOpen ? <div>shared-editor-open</div> : null;
    },
  }),
);

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("ClientInvitationEditorDemo", () => {
  beforeAll(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: memoryStorage(),
    });
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: memoryStorage(),
    });
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearClientAccessDemoInvitations();
  });

  it("opens the shared editor inside its required theme provider after PIN verification", async () => {
    const invitation = createClientAccessDemoInvitation({
      campaignLabel: "Client campaign",
      templateName: "Spectrum",
      allowedTemplateNames: ["Spectrum"],
      allowedTemplateKeys: ["spectrum"],
      creationAccessDays: 3,
      resultAccessDays: 14,
      maxLinks: 8,
      requirePin: true,
      allowImageUploads: true,
      allowDraftSaving: true,
    });
    addClientAccessDemoInvitation(invitation);

    render(<ClientInvitationEditorDemo token={invitation.token} />);

    const pinInput = await screen.findByLabelText(/پینی دەستگەیشتن/);
    await userEvent.type(pinInput, invitation.pin ?? "");
    await userEvent.click(
      screen.getByRole("button", { name: /کردنەوەی دەستکاریکەر/ }),
    );

    expect(screen.getByText("shared-editor-open")).toBeInTheDocument();
  });
});
