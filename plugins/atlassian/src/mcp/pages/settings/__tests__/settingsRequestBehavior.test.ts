import { expect, it, vi } from "vitest";
import { loadActions } from "./helpers/loadActions.js";

it("saves the selected scope with its token and completes setup only when requested", async () => {
  const actions = loadActions({ success: true });
  actions.api.onSubmit(true);
  await vi.waitFor(() =>
    expect(actions.loading).toHaveBeenLastCalledWith(false),
  );
  expect(actions.fetch).toHaveBeenCalledWith("/submit?token=a%26b", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deployment_type: "cloud",
      closeAfter: true,
      scope: "project",
    }),
  });
  expect(actions.confirm).toHaveBeenCalledOnce();
  expect(actions.successScreen).toHaveBeenCalledOnce();
});

it("shows the saved status when keeping the settings page open", async () => {
  const actions = loadActions({ success: true });
  actions.api.onSubmit(false);
  await vi.waitFor(() =>
    expect(actions.loading).toHaveBeenLastCalledWith(false),
  );
  expect(actions.status).toHaveBeenLastCalledWith(
    true,
    "Saved. Settings updated.",
  );
  expect(actions.successScreen).not.toHaveBeenCalled();
});

it("tests connections without adding save scope or close flags", async () => {
  const actions = loadActions({
    success: false,
    message: "Connection rejected",
  });
  actions.api.onTest();
  await vi.waitFor(() =>
    expect(actions.loading).toHaveBeenLastCalledWith(false),
  );
  expect(actions.fetch).toHaveBeenCalledWith("/test?token=a%26b", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deployment_type: "cloud" }),
  });
  expect(actions.status).toHaveBeenLastCalledWith(false, "Connection rejected");
  expect(actions.confirm).not.toHaveBeenCalled();
});

it("reports request failures and restores the loading state", async () => {
  const actions = loadActions({ success: false }, new Error("offline"));
  actions.api.onTest();
  await vi.waitFor(() =>
    expect(actions.loading).toHaveBeenLastCalledWith(false),
  );
  expect(actions.status).toHaveBeenLastCalledWith(
    false,
    "Request failed: offline",
  );
});
