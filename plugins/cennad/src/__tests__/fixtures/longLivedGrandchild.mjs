// Spawned BY a fake provider CLI, not by a test directly: it stands in for the
// shells and tools a real provider starts on its own. It outlives any sane test,
// so if it is still alive after a cancellation the group-kill did not reach it.
setTimeout(() => {}, 60_000);
