// 10 lines of ~4 000 chars each: enough to overrun a small cap several times over,
// with each line individually identifiable so a test can tell head from tail.
for (let i = 0; i < 10; i += 1)
  process.stdout.write(`${"x".repeat(3990)}line-${i}\n`);
