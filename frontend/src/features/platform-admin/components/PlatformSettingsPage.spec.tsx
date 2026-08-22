import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PlatformSettingsPage } from "./PlatformSettingsPage";

vi.mock("next/image", () => ({
  default: ({
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt || ""} />
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/features/link-editor/ColorGradientModal", () => ({
  ColorGradientModal: () => null,
}));

const savedSettings = {
  id: "admin-id",
  username: "operator",
  name: "Saved MultiTree",
  email: "admin@example.com",
  phone: "+964 750 123 4567",
  logo: "/images/upload/multitree/logo.png",
  avatar: "/images/upload/multitree/avatar.png",
  favicon: "/images/upload/multitree/favicon.ico",
  accent_color: "#b6f20d",
  accent_ink_color: "#ffffff",
  app_url: "https://multitree.example",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("PlatformSettingsPage General tab", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads settings from the database API and saves profile and branding", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
      if (!init?.method || init.method === "GET") {
        return jsonResponse({ success: true, data: savedSettings });
      }
      return jsonResponse({ success: true, data: savedSettings });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PlatformSettingsPage />);

    await screen.findByDisplayValue("Saved MultiTree");
    expect(screen.getByDisplayValue("operator")).toBeInTheDocument();
    expect(screen.getByDisplayValue("admin@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+964 750 123 4567")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("https://multitree.example"),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Logo")).toHaveAttribute(
      "src",
      "/images/upload/multitree/logo.png",
    );

    fireEvent.click(screen.getByRole("button", { name: "پاشەکەوتکردن" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/platform/settings/profile",
        expect.objectContaining({ method: "PUT" }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/platform/settings/branding",
        expect.objectContaining({ method: "PUT" }),
      );
    });
  });

  it("shows Google authentication in Login & Sessions and loads security data", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      if (String(input) === "/api/platform/settings/sessions") {
        return jsonResponse({
          success: true,
          data: { sessions: [], recent_activity: [] },
        });
      }
      return jsonResponse({ success: true, data: savedSettings });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PlatformSettingsPage />);
    await screen.findByDisplayValue("Saved MultiTree");
    expect(screen.queryByText("Google OAuth چالاکە")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("tab", { name: "چوونەژوورەوە و دانیشتنەکان" }),
    );

    expect(
      await screen.findByRole("heading", { name: "چوونەژوورەوە بە Google" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/platform/settings/sessions",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });

  it("loads the database-backed data retention tab", async () => {
    const retention = {
      policy: {
        request_log_days: 30,
        api_history_days: 90,
        communication_history_days: 365,
        automatic_cleanup: false,
        cleanup_hour_utc: 2,
        batch_size: 1000,
        updated_at: new Date().toISOString(),
      },
      eligible: { request_logs: 3, api_history: 4, communications: 5 },
      last_run: null,
    };
    const fetchMock = vi.fn<typeof fetch>(async (input) =>
      String(input) === "/api/platform/settings/data-retention"
        ? jsonResponse({ success: true, data: retention })
        : jsonResponse({ success: true, data: savedSettings }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<PlatformSettingsPage />);
    await screen.findByDisplayValue("Saved MultiTree");

    fireEvent.click(screen.getByRole("tab", { name: "داتا و ماوەی هەڵگرتن" }));

    await screen.findByText("تۆماری داواکارییەکانی سیستەم");
    expect(screen.getAllByDisplayValue("365")).toHaveLength(1);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/platform/settings/data-retention",
        expect.objectContaining({ method: "GET" }),
      ),
    );
  });

  it("loads the enforced media and uploads policy", async () => {
    const media = {
      policy: {
        max_upload_size_mb: 5,
        allowed_formats: ["jpeg", "png", "ico"],
        optimize_images: true,
        image_quality: 82,
        max_image_dimension: 2048,
        auto_cleanup_unused: true,
        unused_grace_hours: 72,
        updated_at: new Date().toISOString(),
      },
      stats: { asset_count: 12, stored_bytes: 2048, saved_bytes: 1024 },
      unused_assets: 2,
    };
    const fetchMock = vi.fn<typeof fetch>(async (input) =>
      String(input) === "/api/platform/settings/media"
        ? jsonResponse({ success: true, data: media })
        : jsonResponse({ success: true, data: savedSettings }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<PlatformSettingsPage />);
    await screen.findByDisplayValue("Saved MultiTree");

    fireEvent.click(screen.getByRole("tab", { name: "میدیا و بارکردن" }));

    await screen.findByText("جۆری فایلە ڕێگەپێدراوەکان");
    expect(screen.getByDisplayValue("2048")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "JPG / JPEG" })).toBeChecked();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/platform/settings/media",
        expect.objectContaining({ method: "GET" }),
      ),
    );
  });

  it("shows the Kurdish TikTok tab with the shared business configuration UI", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const endpoint = String(input);
      if (endpoint === "/api/platform/settings/tiktok") {
        return jsonResponse({ success: true, data: { tiktok_configs: [] } });
      }
      if (endpoint === "/api/platform/settings/tiktok/health") {
        return jsonResponse({
          success: true,
          data: { connections: 0, serverEvents: 0, browserEvents: 0 },
        });
      }
      if (endpoint === "/api/platform/settings/tiktok/errors") {
        return jsonResponse({ success: true, data: { items: [] } });
      }
      return jsonResponse({ success: true, data: savedSettings });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PlatformSettingsPage />);
    await screen.findByDisplayValue("Saved MultiTree");

    expect(
      screen.queryByRole("tab", { name: "TikTok Tracking" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "ڕێکخستنەکانی تیکتۆک" }));

    expect(
      await screen.findByRole("heading", { name: "پەیوەستکردنی TikTok" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("گرووپەکانی Pixel و Events API"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Pixel و Events APIی تایبەت بە پەڕە گشتییەکانی MultiTree. هیچ کاتێک بۆ پەڕەی بزنسەکان بەکار نایەت.",
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/platform/settings/tiktok",
        expect.objectContaining({ credentials: "include" }),
      ),
    );
  });
});
