// Session heartbeat. A 404 means the session ended and a 401 a token this page
// can never renew — both are final. Any other failure — network error or
// non-2xx — counts toward `offline` only after OFFLINE_AFTER_FAILURES in a
// row, and the next success flips back to `alive`.
// States are reported on transition only; a tab returning to the foreground
// pings at once instead of waiting out a throttled interval.

export const OFFLINE_AFTER_FAILURES = 3;

export function startHeartbeat({ ping, intervalMs, onState }) {
  let failures = 0;
  let current = "connecting";
  let stopped = false;
  let timer = null;

  const emit = (state) => {
    if (state === current) return;
    current = state;
    onState(state);
  };
  const stop = () => {
    stopped = true;
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    document.removeEventListener("visibilitychange", onVisible);
  };
  const fail = () => {
    failures += 1;
    if (failures >= OFFLINE_AFTER_FAILURES) emit("offline");
  };
  const tick = () =>
    ping()
      .then((response) => {
        if (stopped) return;
        if (response.status === 404) {
          emit("ended");
          stop();
          return;
        }
        // The page's token never changes, so a rejected token cannot recover.
        if (response.status === 401) {
          emit("offline");
          stop();
          return;
        }
        if (!response.ok) {
          fail();
          return;
        }
        failures = 0;
        emit("alive");
      })
      .catch(() => {
        if (!stopped) fail();
      });
  const onVisible = () => {
    if (!document.hidden && !stopped) void tick();
  };

  document.addEventListener("visibilitychange", onVisible);
  void tick();
  timer = setInterval(tick, intervalMs);
  return { stop };
}
